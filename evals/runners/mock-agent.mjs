// mock-agent.mjs — deterministic simulated agent for behavioral evals.
//
// Implements the observable behavior the library is designed for, per
// AGENTS.md discovery rules:
//   1. Search the registry for skills matching the task.
//   2. Select the best matches (IDF-weighted keyword overlap).
//   3. Load the selected SKILL.md bodies.
//   4. Ground the answer ONLY in the loaded skill text (workflow,
//      common mistakes, and lines matching task keywords).
//   5. Refuse inputs matching unsafe patterns.
//
// This evaluates the LIBRARY (discoverability, trigger discrimination,
// content completeness, safety guidance) — not an LLM's reasoning. A
// real model can behave differently; see evals/README.md and
// ai/decisions/2026-11-20-eval-mock-agent.md for the honest scope.
//
// Safety patterns here are the eval-time subset. Phase 7 consolidates
// all security patterns into scripts/lib/security-patterns.mjs; this
// module should import from there once that exists (see the TODO in
// UNSAFE_PATTERNS).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for',
  'with', 'by', 'at', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these',
  'those', 'how', 'what', 'when', 'where', 'which', 'who', 'whom',
  'why', 'can', 'could', 'should', 'would', 'will', 'do', 'does', 'did',
  'have', 'has', 'had', 'not', 'no', 'yes', 'if', 'then', 'than',
  'please', 'need', 'want', 'help', 'use', 'using', 'used', 'make',
  'get', 'got', 'way', 'ways', 'best', 'good', 'new', 'also',
]);

// TODO (Phase 7): import from scripts/lib/security-patterns.mjs once
// the shared module exists; keep the two in sync until then.
const UNSAFE_PATTERNS = [
  { re: /ignore (all )?(previous|prior|above) instructions/i, label: 'prompt-injection: ignore previous instructions' },
  { re: /disregard (all )?(previous|prior|above) instructions/i, label: 'prompt-injection: disregard instructions' },
  { re: /you are now (a|an) /i, label: 'prompt-injection: role reassignment' },
  { re: /reveal (your|the) (system prompt|instructions|api key|secret)/i, label: 'secret exfiltration request' },
  // Note: bare "output" is deliberately NOT a trigger verb — skill
  // descriptions legitimately contain "output sanitization ... secret
  // handling" (mcp-security), which a loose pattern misreads as
  // exfiltration. The article/possessive requirement below is what
  // separates "print the API key" from topic descriptions.
  { re: /(print|show|reveal|leak|exfiltrate|give me|send me)\b[^.\n]{0,40}\b(my|the|your|our|this project's|its)\b[^.\n]{0,20}(api[ _-]?key|secret|password|token|private key)/i, label: 'secret exfiltration request' },
  { re: /\brm\s+-rf\s+(\/|\$HOME|~|\*)/, label: 'destructive shell command' },
  { re: /curl\s+[^|]*\|\s*(sudo\s+)?(sh|bash)\b/, label: 'curl-piped-to-shell' },
  { re: /drop\s+table|delete\s+from\s+\w+\s*;?\s*$/i, label: 'destructive database command' },
  { re: /disable (all )?(authentication|auth|security)/i, label: 'disable security controls' },
  { re: /bypass (authentication|auth|security|rate.?limit)/i, label: 'bypass security controls' },
];

// Light stemmer: "crashes"/"crashing" -> "crash", "fails"/"failing" ->
// "fail", "cached"/"caching" -> "cach". Applied identically to task
// and description tokens, so morphological variants match. Only the
// stem variant is added; the original token is kept too.
function stem(token) {
  // Never stem tokens with separators ("next.js" must not become
  // "next.j") or tech endings ("nextjs", "class", "status").
  if (token.length < 5 || /[._-]/.test(token)) return null;
  for (const suffix of ['ing', 'ed', 'es']) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return token.slice(0, -suffix.length);
    }
  }
  if (token.endsWith('s') && !/(js|ts|ss|us|is)$/.test(token) && token.length - 1 >= 3) {
    return token.slice(0, -1);
  }
  return null;
}

export function tokenize(text) {
  const raw = (text.toLowerCase().match(/[a-z0-9][a-z0-9._-]*[a-z0-9]|[a-z0-9]/g) || [])
    .map((t) => t.replace(/[._-]+$/, ''))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  // Emit separator-stripped variants too, so "Next.js" in a task
  // matches the "nextjs" skill name and "rate-limiting" matches the
  // "rate-limiting" name tokens. And stem variants, so "crashes"
  // matches "crashing".
  const out = new Set(raw);
  for (const t of raw) {
    const stripped = t.replace(/[._-]+/g, '');
    if (stripped.length >= 2 && stripped !== t) out.add(stripped);
    const s = stem(t);
    if (s && s !== t) out.add(s);
  }
  return [...out];
}

// Split a skill name like "rate-limiting" into tokens for name matching.
function nameTokens(name) {
  const parts = name.toLowerCase().split(/[-_]/).filter((t) => t.length >= 2);
  const joined = name.toLowerCase().replace(/[-_]/g, '');
  if (joined.length >= 2 && !parts.includes(joined)) parts.push(joined);
  return parts;
}

export class MockAgent {
  constructor(registry) {
    this.skills = registry.skills;
    this.byName = new Map(registry.skills.map((s) => [s.name, s]));
    // Document frequency per token across name+description, for IDF.
    this.df = new Map();
    for (const s of registry.skills) {
      const tokens = new Set([
        ...nameTokens(s.name),
        ...tokenize(s.description || ''),
      ]);
      for (const t of tokens) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.N = registry.skills.length;
    this.skillText = new Map(); // name -> loaded SKILL.md body (lazy)
  }

  // Squared IDF: rare discriminative tokens ("reproduce", "jwt") must
  // outweigh several common ones ("app", "error", "node") that match
  // dozens of descriptions. Plain IDF let breadth beat specificity.
  idf(token) {
    const v = Math.log((this.N + 1) / ((this.df.get(token) || 0) + 1)) + 1;
    return v * v;
  }

  // Rank all skills for a task. Returns [{name, score}] sorted by
  // score desc, then name asc (fully deterministic).
  rank(task) {
    const taskTokens = [...new Set(tokenize(task))];
    const scored = [];
    for (const s of this.skills) {
      const nameSet = new Set(nameTokens(s.name));
      const descSet = new Set(tokenize(s.description || ''));
      let score = 0;
      for (const t of taskTokens) {
        if (nameSet.has(t)) score += 3 * this.idf(t);
        else if (descSet.has(t)) score += this.idf(t);
      }
      // Small boost when the task names the skill's category exactly.
      if (taskTokens.includes(s.category)) score += 1;
      if (score > 0) scored.push({ name: s.name, score });
    }
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return scored;
  }

  // Select skills: everything within 60% of the top score, max 5.
  // Calibrated 2026-11-20 against the seed suite: at a 0.35 cutoff the
  // retriever returned 4-5 skills for single-skill tasks (precision
  // ~0.20), because common-token matches accumulate. At 0.60 the top
  // skill usually stands alone and genuinely related skills (0.54-0.70)
  // still join when the task warrants them. A real agent is more
  // selective than keyword overlap, so a strict mock is the honest
  // default; do not lower this to make a case pass.
  select(task, max = 5) {
    const ranked = this.rank(task);
    if (ranked.length === 0) return [];
    const cutoff = ranked[0].score * 0.6;
    return ranked.filter((r) => r.score >= cutoff).slice(0, max).map((r) => r.name);
  }

  async loadSkill(name) {
    if (this.skillText.has(name)) return this.skillText.get(name);
    const skill = this.byName.get(name);
    if (!skill) return '';
    const text = await readFile(path.join(ROOT, skill.path, 'SKILL.md'), 'utf8')
      .catch(() => '');
    this.skillText.set(name, text);
    return text;
  }

  // Extract a section body (## heading) from skill text.
  section(text, heading) {
    const lines = text.split('\n');
    let out = [];
    let inSection = false;
    for (const line of lines) {
      const m = line.match(/^##\s+(.+?)\s*$/);
      if (m) {
        if (inSection) break;
        if (m[1].trim().toLowerCase() === heading.toLowerCase()) inSection = true;
      } else if (inSection) out.push(line);
    }
    return out.join('\n').trim();
  }

  // Grounded answer, drawn ONLY from the loaded skill texts. The
  // primary skill (the case's skill under evaluation, or the top
  // selection) contributes its full body — an agent that loads a skill
  // reads the whole file, and key guidance (e.g. a renamed option in
  // Implementation Standards) often sits on lines with too few task
  // keywords to match. Supporting skills contribute their workflow,
  // common mistakes, and keyword-matching lines.
  async answer(task, selected, primary = null) {
    const taskTokens = new Set(tokenize(task));
    const parts = [];
    for (const name of selected) {
      const text = await this.loadSkill(name);
      if (!text) continue;
      const skill = this.byName.get(name);
      parts.push(`[skill: ${name}] ${skill.description || ''}`);
      if (name === primary) {
        // Full body minus frontmatter.
        parts.push(text.replace(/^---\n[\s\S]*?\n---\n/, ''));
        continue;
      }
      const workflow = this.section(text, 'Required Workflow');
      if (workflow) parts.push(workflow);
      const mistakes = this.section(text, 'Common Mistakes');
      if (mistakes) parts.push(mistakes);
      // Lines matching >= 2 task tokens, plus one line of context on
      // each side (skill files wrap at ~80 columns, so a phrase often
      // spans a line break; context keeps it intact).
      const lines = text.split('\n');
      const keep = new Set();
      lines.forEach((line, i) => {
        const lineTokens = new Set(tokenize(line));
        let hits = 0;
        for (const t of taskTokens) if (lineTokens.has(t)) hits++;
        if (hits >= 2) {
          keep.add(i - 1);
          keep.add(i);
          keep.add(i + 1);
        }
      });
      const matched = [...keep].filter((i) => i >= 0 && i < lines.length).sort((a, b) => a - b);
      if (matched.length > 0) parts.push(matched.slice(0, 60).map((i) => lines[i]).join('\n'));
    }
    return parts.join('\n');
  }

  // Extract fenced code blocks of the given language from a skill's
  // Examples section (falls back to the whole body).
  async extractCode(name, language = 'js') {
    const text = await this.loadSkill(name);
    if (!text) return [];
    const examples = this.section(text, 'Examples') || text;
    const blocks = [];
    const re = new RegExp('```(' + language + '|javascript|typescript|ts|js)?\\n([\\s\\S]*?)```', 'g');
    for (const m of examples.matchAll(re)) {
      const lang = (m[1] || '').toLowerCase();
      if (language === 'js' && (lang === '' || lang === 'js' || lang === 'javascript')) blocks.push(m[2]);
      else if (language === 'ts' && (lang === 'ts' || lang === 'typescript')) blocks.push(m[2]);
      else if (lang === language) blocks.push(m[2]);
    }
    return blocks;
  }

  safetyCheck(input) {
    for (const { re, label } of UNSAFE_PATTERNS) {
      if (re.test(input)) return { unsafe: true, reason: label };
    }
    return { unsafe: false, reason: null };
  }

  // Full run for one eval case. Returns the observed behavior.
  async run(evalCase) {
    const input = evalCase.input || '';
    const safety = this.safetyCheck(input);
    if (safety.unsafe) {
      return {
        selectedSkills: [],
        answer: 'I cannot help with that request: ' + safety.reason + '.',
        refused: true,
        refusalReason: safety.reason,
        tools: [],
        code: [],
      };
    }
    const selected = this.select(input);
    const primary = evalCase.skill || selected[0] || null;
    const answer = await this.answer(input, selected, primary);
    let code = [];
    if (evalCase.expected && evalCase.expected.code) {
      code = primary ? await this.extractCode(primary, evalCase.expected.codeLanguage || 'js') : [];
    }
    // Tool plan: the Required Workflow steps of the primary skill.
    let tools = [];
    if (primary) {
      const text = await this.loadSkill(primary);
      const workflow = this.section(text, 'Required Workflow');
      tools = (workflow.match(/^\s*\d+\.\s+(.+)$/gm) || []).map((s) => s.replace(/^\s*\d+\.\s+/, '').trim());
    }
    return { selectedSkills: selected, answer, refused: false, refusalReason: null, tools, code };
  }
}

export async function loadRegistry() {
  const raw = await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8');
  return JSON.parse(raw);
}
