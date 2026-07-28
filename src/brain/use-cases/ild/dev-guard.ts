/** Idea Lab is production-impossible. */
export function assertDev(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }
}
