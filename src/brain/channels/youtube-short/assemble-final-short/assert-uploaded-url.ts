export async function assertUploadedUrlRetrievable(
  url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return { ok: true };
    const ranged = await fetch(url, {
      headers: { Range: "bytes=0-1023" },
    });
    if (ranged.ok || ranged.status === 206) return { ok: true };
    return {
      ok: false,
      error: `Uploaded Final Short URL not retrievable (${ranged.status})`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Uploaded Final Short URL check failed: ${err.message}`
          : "Uploaded Final Short URL check failed",
    };
  }
}
