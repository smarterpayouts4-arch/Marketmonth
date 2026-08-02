export async function defaultFetchStill(url: string): Promise<{
  bytes: Buffer;
  mimeType: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch source still (${res.status})`);
    }
    const ab = await res.arrayBuffer();
    const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim();
    const lower = url.toLowerCase();
    const guessMime =
      lower.includes(".jpg") || lower.includes(".jpeg")
        ? "image/jpeg"
        : lower.includes(".webp")
          ? "image/webp"
          : "image/png";
    return {
      bytes: Buffer.from(ab),
      mimeType: headerMime || guessMime,
    };
  } finally {
    clearTimeout(timer);
  }
}
