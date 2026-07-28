import { z } from "zod";

export const detectedLocationSchema = z.object({
  formattedAddress: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  sourceUrl: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

export type DetectedLocation = z.infer<typeof detectedLocationSchema>;

/** Full grounded address when present (evidence / confirmation). */
export function formatDetectedLocation(loc: DetectedLocation): string {
  if (loc.formattedAddress?.trim()) return loc.formattedAddress.trim();
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  return parts.join(", ");
}

/** Short target for UI + intent: "Tampa, FL". */
export function formatCityState(loc: DetectedLocation): string {
  const city = loc.city?.trim();
  const region = loc.region?.trim();
  if (city && region) return `${city}, ${region}`;
  if (city) return city;
  if (region) return region;

  const addr = loc.formattedAddress?.trim();
  if (!addr) return "";

  const parts = addr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 1; i--) {
    if (!/^[A-Z]{2}$/i.test(parts[i])) continue;
    const state = parts[i].toUpperCase();
    const maybeCity = parts[i - 1];
    if (maybeCity && !/^\d/.test(maybeCity)) {
      return `${maybeCity}, ${state}`;
    }
  }

  return parts[0] ?? "";
}
