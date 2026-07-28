export function parseFrontmatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return { data: {}, body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { data: {}, body: text };
  const block = text.slice(4, end);
  const data = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    data[m[1]] = v;
  }
  const body = text.slice(end + 4).replace(/^\r?\n/, "");
  return { data, body };
}
