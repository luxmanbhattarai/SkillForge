// Minimal YAML frontmatter parser for SKILL.md files.
// Supports only the subset this repository uses: top-level scalar keys,
// folded (>) and literal (|) block scalars, and one level of nested
// string maps (metadata:). It is intentionally strict: anything else
// is a validation error, not a silent guess.

export function splitFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { error: 'missing frontmatter: file must start with ---\n' };
  }
  const rest = text.replace(/^---\r?\n/, '');
  const endIdx = rest.search(/^---\r?$/m);
  if (endIdx === -1) return { error: 'missing closing --- for frontmatter' };
  const raw = rest.slice(0, endIdx);
  const body = rest.slice(endIdx).replace(/^---\r?\n?/, '');
  return { raw, body };
}

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Parses the frontmatter block. Returns { data } or { error }.
export function parseFrontmatter(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
    if (/^\s/.test(line)) {
      return { error: `unexpected indented line at frontmatter line ${i + 1}: ${line.trim()}` };
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) return { error: `unparseable frontmatter line ${i + 1}: ${line}` };
    const [, key, rest] = m;
    const value = rest.trim();
    if (value === '>' || value === '|' || value === '>-' || value === '|-') {
      // Block scalar: consume following indented lines.
      const folded = value.startsWith('>');
      const parts = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        parts.push(lines[i].replace(/^  /, ''));
        i++;
      }
      // Trim trailing blank lines.
      while (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
      data[key] = folded ? parts.join(' ').replace(/\s+/g, ' ').trim() : parts.join('\n');
      continue;
    }
    if (value === '') {
      // Empty value: either a nested map (metadata:) or a plain multi-line
      // scalar (indented continuation lines, folded with spaces).
      i++;
      if (i < lines.length && /^  [A-Za-z0-9_-]+:/.test(lines[i])) {
        const map = {};
        while (i < lines.length && /^  [A-Za-z0-9_-]+:/.test(lines[i])) {
          const sm = lines[i].match(/^  ([A-Za-z0-9_-]+):\s*(.*)$/);
          map[sm[1]] = unquote(sm[2]);
          i++;
        }
        data[key] = map;
        continue;
      }
      const parts = [];
      while (i < lines.length && /^  \S/.test(lines[i])) {
        parts.push(lines[i].trim());
        i++;
      }
      if (!parts.length) return { error: `key '${key}' has no value` };
      data[key] = parts.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    data[key] = unquote(value);
    i++;
  }
  return { data };
}

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateName(name) {
  if (typeof name !== 'string' || name.length < 1 || name.length > 64) {
    return 'name must be 1-64 characters';
  }
  if (!NAME_RE.test(name)) {
    return 'name must be lowercase letters, digits, and hyphens only, with no leading, trailing, or consecutive hyphens';
  }
  return null;
}
