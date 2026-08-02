/**
 * Pure helper: durable motionPrompt → Veo image-to-video instruction.
 * Client-safe. Channel prepare-scene-video remains the only generation entry.
 */

export function composeEffectiveVeoPrompt(input: {
  motionPrompt: string;
  visualPrompt: string;
}): string {
  const motion = input.motionPrompt.trim();
  const stillCue = input.visualPrompt.trim().slice(0, 280);

  const identityLock = [
    "Preserve identity, face, hairstyle, wardrobe, body proportions, bedroom, lighting, and composition consistent with the source still image.",
    "Keep the subject on the right and preserve clear negative space on the left for titles.",
    "Locked vertical 9:16 camera. No on-screen text, captions, logos, extra people, distorted hands, or new objects.",
  ].join(" ");

  const parts = [motion, identityLock];
  if (stillCue) {
    parts.push(`Match the locked still plate (brief cue): ${stillCue}`);
  }
  return parts.filter(Boolean).join("\n\n");
}
