export function padSummary(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (t.length < 180) {
    t = `${t} Keep the idea specific enough to evaluate and distinct from the other five opportunities under the same master topic.`;
  }
  if (t.length > 600) {
    return `${t.slice(0, 599).trimEnd()}…`;
  }
  return t;
}

export function clamp(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
