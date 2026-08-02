/**
 * Operator checklist for Step 5 — first complete manual YouTube Short.
 *
 * Does not call live providers. Prints readiness gates and the evaluation
 * sequence. Run under NODE_ENV=development after enabling live render flags.
 *
 *   npx tsx scripts/operator-first-short-eval.ts
 */

const LIVE_FLAGS = [
  "MM_IMAGE_RENDER",
  "MM_VOICE_RENDER",
  "MM_SCENE_COMPOSE_RENDER",
  "MM_SCENE_COMPOSITOR",
  "MM_VIDEO_RENDER",
] as const;

const SECRET_PRESENCE = [
  "GEMINI_API_KEY",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
] as const;

function present(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

function main(): void {
  console.log("=== First Manual YouTube Short — operator eval ===\n");
  console.log(`NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
  console.log(
    "Required for this milestone: NODE_ENV=development (JSON bundle store).\n"
  );

  console.log("Live render flags (values shown; secrets not printed):");
  for (const name of LIVE_FLAGS) {
    const v = process.env[name]?.trim() || "(unset)";
    console.log(`  ${name}=${v}`);
  }

  console.log("\nProvider credentials (presence only):");
  for (const name of SECRET_PRESENCE) {
    console.log(`  ${name}: ${present(name) ? "present" : "MISSING"}`);
  }

  const ready =
    process.env.NODE_ENV !== "production" &&
    process.env.MM_IMAGE_RENDER === "live" &&
    process.env.MM_VOICE_RENDER === "live" &&
    process.env.MM_SCENE_COMPOSE_RENDER === "live" &&
    process.env.MM_SCENE_COMPOSITOR === "ffmpeg" &&
    SECRET_PRESENCE.every(present);

  console.log("\n--- Evaluation sequence ---");
  console.log("1. Approve/lock a Content Atom → open /content?atomId=…");
  console.log("2. For each scene: save prompts → Image → Voice → (Video if needed) → Compose");
  console.log("3. Edit OST/narration → confirm Outdated badges → recompose");
  console.log("4. When Export shows Ready → Assemble Final Short");
  console.log("5. Preview Full Short + Download for manual YouTube upload");
  console.log("6. Reload page → confirm bundle restores Ready assets");
  console.log("7. Subjective quality pass: stills, VO sync, OST readability, pacing\n");

  if (ready) {
    console.log("Gate: READY for live-provider evaluation.");
    process.exit(0);
  }

  console.log(
    "Gate: NOT READY — set live flags + ImageKit/Gemini credentials, then re-run."
  );
  process.exit(2);
}

main();
