// security-patterns.mjs — shared security detection patterns.
//
// Single source of truth for the security scanner
// (scripts/security-scan.mjs), the quality scorer
// (scripts/score-skills.mjs), and the eval mock agent
// (evals/runners/mock-agent.mjs). Previously these three each carried
// their own copy of the pattern list; they drifted. Add a pattern here
// once, with its scope, and all three consumers stay in sync.
//
// Each pattern: { id, severity, label, re, scopes, guard? }
//   id       stable identifier (SCANNER exceptions reference it)
//   severity high | medium | low
//   scopes   which consumers use it:
//              scan  — the repo scanner (all patterns)
//              score — the quality scorer's security dimension
//                      (secrets + injection only; code-vuln patterns
//                      need context triage and would false-positive
//                      on skills that document anti-patterns)
//              input — eval mock-agent input checks (unsafe requests)
//   guard    optional (match, line) => boolean; return false to skip
//            the match (e.g. placeholder values in examples)
//
// Patterns are line-based regexes: fast, explainable, and honest about
// their limits (see docs/SECURITY-SCANNING.md). They are a smoke
// screen, not SAST. Anything flagged needs human review.

// Words that mark a value as an obvious placeholder, not a real
// credential. The guards below skip matches whose value contains one.
// Trade-off (documented in docs/SECURITY-SCANNING.md): a real leaked
// credential containing one of these words would be missed. In a docs
// repository the realistic noise is example passwords; reviewers still
// eyeball every SEC finding the scanner does report.
const PLACEHOLDER_RE = /(\$|<|>|example|your-|changeme|placeholder|xxx|todo|dummy|redacted|password|secret|test|demo|sample|fake|1234|abcd|qwerty)/i;

export const PATTERNS = [
  // --- Secrets (high; scan + score) ---
  {
    id: 'SEC-01', severity: 'high', label: 'private key material',
    re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
    scopes: ['scan', 'score'],
  },
  {
    id: 'SEC-02', severity: 'high', label: 'possible API/token secret (known prefix)',
    re: /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|npm_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{10,})/,
    scopes: ['scan', 'score'],
  },
  {
    id: 'SEC-03', severity: 'high', label: 'possible AWS access key ID',
    re: /\bAKIA[0-9A-Z]{16}\b/,
    scopes: ['scan', 'score'],
  },
  {
    id: 'SEC-04', severity: 'high', label: 'possible JWT (verify: the standard jwt.io example is a documented fake)',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    scopes: ['scan', 'score'],
    guard: (m) => !m[0].startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwI'),
  },
  {
    id: 'SEC-05', severity: 'high', label: 'possible hardcoded credential',
    re: /(?:api[_-]?key|secret|password|passwd|pwd|token)\s*[:=]\s*['"]([^'"]{8,})['"]/i,
    scopes: ['scan', 'score'],
    guard: (m) => !PLACEHOLDER_RE.test(m[1] || ''),
  },
  {
    id: 'SEC-06', severity: 'high', label: 'connection string with embedded password',
    re: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/]+:[^@\s/]{3,}@[^\s/]+/i,
    scopes: ['scan', 'score'],
    guard: (m) => !PLACEHOLDER_RE.test(m[0]),
  },
  {
    id: 'SEC-07', severity: 'high', label: 'possible private key file reference with inline key material',
    re: /(?:private[_-]?key|client[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9+/=]{32,}['"]/i,
    scopes: ['scan', 'score'],
    guard: (m) => !PLACEHOLDER_RE.test(m[0]),
  },

  // --- Prompt injection (high; scan + score + input) ---
  {
    id: 'INJ-01', severity: 'high', label: 'prompt-injection marker: ignore previous instructions',
    re: /ignore (all )?(previous|prior|above) instructions/i,
    scopes: ['scan', 'score', 'input'],
  },
  {
    id: 'INJ-02', severity: 'high', label: 'prompt-injection marker: disregard instructions',
    re: /disregard (all )?(previous|prior|above) instructions/i,
    scopes: ['scan', 'score', 'input'],
  },
  {
    id: 'INJ-03', severity: 'high', label: 'prompt-injection marker: role reassignment',
    re: /you are now (a|an) /i,
    scopes: ['scan', 'score', 'input'],
  },
  {
    id: 'INJ-04', severity: 'high', label: 'prompt-injection marker: system-prompt extraction',
    re: /reveal (your|the) (system prompt|instructions|api[ _-]?key|secret)/i,
    scopes: ['scan', 'score', 'input'],
  },

  // --- Dangerous shell / commands (scan only; examples abound) ---
  {
    id: 'CMD-01', severity: 'high', label: 'curl/wget-piped-to-shell or shell-executed download command',
    // Covers the classic pipe form for both downloaders, plus the
    // command-substitution form (`sh -c "$(curl …)"`) and process
    // substitution (`bash <(curl …)`) — all three execute remote
    // content without review (audit A5-13). `$(curl …)` on its own
    // (output capture, no shell execution) deliberately does NOT
    // match, and neither does a plain `curl -o file` download.
    re: /(?:(?:curl|wget)\s+[^|]*\|\s*(?:sudo\s+)?(?:sh|bash)\b|(?:sh|bash)\s+-c\s+["'`]?\$\((?:curl|wget)\b|(?:sh|bash)\s+<\((?:curl|wget)\b)/,
    scopes: ['scan'],
  },
  {
    id: 'CMD-02', severity: 'medium', label: 'destructive rm -rf on a root/home path',
    re: /rm\s+-rf\s+(\/|\$HOME|~)/,
    scopes: ['scan'],
  },
  {
    id: 'CMD-03', severity: 'low', label: 'rm -rf with a variable path (verify the variable cannot be empty or /)',
    re: /rm\s+(?:-rf|-fr)\s+["']?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/,
    scopes: ['scan'],
  },
  {
    id: 'CMD-04', severity: 'medium', label: 'pip install without version pin (supply-chain: unpinned install)',
    re: /pip(?:3)? install (?!.*==)(?!.*-r )[^#\n]*\b[a-z0-9_-]+/i,
    scopes: ['scan'],
  },

  // --- Code vulnerabilities (scan only; skills document anti-patterns) ---
  {
    id: 'CODE-01', severity: 'high', label: 'dynamic code execution: eval()',
    re: /\beval\s*\(/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-02', severity: 'high', label: 'dynamic code execution: Function() constructor',
    re: /\bnew Function\s*\(/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-03', severity: 'high', label: 'possible SQL injection: string-built query',
    // The SQL keyword must sit inside a string/template (quote or
    // backtick before it): bare "update" in prose ("would update ${x}")
    // is not SQL. Bare "user" is not a trigger: "skills.user" and
    // table names false-positive; userInput/userXxx still match.
    re: /[`"'(](SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[^;\n]*\+[^;\n]*(req\.|request\.|params\.|query\.|body\.|input|userInput|user[A-Z])/i,
    scopes: ['scan'],
  },
  {
    id: 'CODE-04', severity: 'high', label: 'possible SQL injection: template/f-string query with interpolation',
    // Same quote guard as CODE-03. The f-string alternative needs a
    // word boundary: "itself'" (f + quote) is not an f-string.
    re: /[`"'(](SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[^;\n]*(\$\{|\bf["'])/i,
    scopes: ['scan'],
  },
  {
    id: 'CODE-05', severity: 'medium', label: 'possible XSS: innerHTML with a variable',
    re: /\.innerHTML\s*=\s*[^"'\n]*(\$\{|\+|req\.|params\.|query\.|input|user)/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-06', severity: 'medium', label: 'possible XSS: dangerouslySetInnerHTML in use',
    // Only actual JSX usage (={{), not prose mentions ("avoid
    // dangerouslySetInnerHTML") — those are guidance, not code.
    re: /dangerouslySetInnerHTML\s*=\s*\{\{/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-07', severity: 'high', label: 'possible command injection: exec/spawn with shell or interpolation',
    re: /(exec|execSync|spawn|spawnSync)\s*\([^)]*(\$\{|shell\s*:\s*true|\+)/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-08', severity: 'high', label: 'possible command injection (python): shell=True or os.system',
    re: /(shell\s*=\s*True|os\.system\s*\(|os\.popen\s*\()/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-09', severity: 'high', label: 'insecure deserialization: pickle load',
    re: /pickle\.(load|loads|Unpickler)\s*\(/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-10', severity: 'medium', label: 'insecure deserialization: yaml.load without SafeLoader',
    re: /yaml\.load\s*\((?!.*SafeLoader)/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-11', severity: 'medium', label: 'weak crypto: MD5/SHA-1 for passwords or tokens',
    re: /(createHash\s*\(\s*['"](md5|sha1)['"]|hashlib\.(md5|sha1)\s*\()/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-12', severity: 'medium', label: 'weak randomness: Math.random for a secret or token',
    // Word boundaries: "cache keys" is not a cryptographic key.
    re: /Math\.random\s*\(\s*\).{0,60}\b(secret|token|password|key)\b/i,
    scopes: ['scan'],
  },
  {
    id: 'CODE-13', severity: 'medium', label: 'possible path traversal: unsanitized path join with user input',
    // No bare "user": targetDef.skills.user is a config key, not input.
    re: /path\.join\s*\([^)]*(req\.|params\.|query\.|body\.|input|userInput|user[A-Z])/,
    scopes: ['scan'],
  },
  {
    id: 'CODE-14', severity: 'medium', label: 'TLS verification disabled',
    re: /(rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|verify\s*=\s*False)/,
    scopes: ['scan'],
  },

  // --- Unsafe-request patterns (input scope only: eval mock agent) ---
  {
    id: 'REQ-01', severity: 'high', label: 'secret exfiltration request',
    // Bare "output" is deliberately NOT a trigger verb: skill
    // descriptions legitimately contain "output sanitization ...
    // secret handling" (mcp-security). The article/possessive
    // requirement separates "print the API key" from topic text.
    re: /(print|show|reveal|leak|exfiltrate|give me|send me)\b[^.\n]{0,40}\b(my|the|your|our|this project's|its)\b[^.\n]{0,20}(api[ _-]?key|secret|password|token|private key)/i,
    scopes: ['input'],
  },
  {
    id: 'REQ-02', severity: 'high', label: 'destructive shell command request',
    re: /\brm\s+-rf\s+(\/|\$HOME|~|\*)/,
    scopes: ['input'],
  },
  {
    id: 'REQ-03', severity: 'high', label: 'curl-piped-to-shell request',
    re: /curl\s+[^|]*\|\s*(?:sudo\s+)?(?:sh|bash)\b/,
    scopes: ['input'],
  },
  {
    id: 'REQ-04', severity: 'high', label: 'destructive database command request',
    re: /drop\s+table|delete\s+from\s+\w+\s*;?\s*$/i,
    scopes: ['input'],
  },
  {
    id: 'REQ-05', severity: 'high', label: 'disable or bypass security controls',
    re: /(disable (all )?(authentication|auth|security)|bypass (authentication|auth|security|rate.?limit))/i,
    scopes: ['input'],
  },
];

export function patternsFor(scope) {
  return PATTERNS.filter((p) => p.scopes.includes(scope));
}

// Scan one line; returns [{ pattern, match }] for matches that pass
// the pattern's guard (if any).
export function scanLine(line, scope = 'scan') {
  const hits = [];
  for (const p of patternsFor(scope)) {
    const m = line.match(p.re);
    if (m && (!p.guard || p.guard(m, line))) hits.push({ pattern: p, match: m[0] });
  }
  return hits;
}
