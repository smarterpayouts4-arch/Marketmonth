export function normName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

export function catalogNames(
  items: Array<{ name: string } | string> | undefined
): string[] {
  if (!items?.length) return [];
  return items
    .map((x) => (typeof x === "string" ? x : x.name))
    .filter(Boolean)
    .map((n) => n.trim());
}
