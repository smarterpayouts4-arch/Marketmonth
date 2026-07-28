export function mdTable(headers, rows) {
  const lines = [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
  ];
  for (const r of rows) lines.push("| " + r.join(" | ") + " |");
  return lines.join("\n");
}
