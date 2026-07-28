#!/usr/bin/env node
/**
 * stop — Knowledge OS completion check for structural sessions + evidence reminder.
 * Runs knowledge:update then knowledge:check when structural paths were touched.
 * No continuous watcher. Fail-open for hook infrastructure errors (still report).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { anyStructural } from "./lib/knowledge-structural.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const markerPath = path.join(__dirname, ".aps-session.json");
const repoRoot = path.resolve(__dirname, "../..");
const warningsRel = "project-knowledge/generated/reports/STRUCTURE_WARNINGS.md";
const qualityRel = "project-knowledge/generated/reports/QUALITY_SCORE.md";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve("{}"));
  });
}

function trimOutput(text, max = 3500) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return "…[truncated]\n" + t.slice(-max);
}

await readStdin();

let session = { substantial: false, routed: false, reminderEmitted: false, touchedPaths: [] };
try {
  session = {
    substantial: false,
    routed: false,
    reminderEmitted: false,
    touchedPaths: [],
    ...JSON.parse(fs.readFileSync(markerPath, "utf8")),
  };
  fs.unlinkSync(markerPath);
} catch {
  /* ignore */
}

const structural = anyStructural(session.touchedPaths);
const substantial = Boolean(session.substantial);
const routed = Boolean(session.routed);
const routingNote = substantial && !routed
  ? " Routing was never confirmed in session state (a hook reminder is not routing). The user-visible contract remains a first-paragraph `Selected workflows:` brief — agent_message is model-side, not a dashboard."
  : substantial && routed
    ? " Session routing ack present (.aps-routed-ack.json)."
    : "";

if (!structural && !substantial) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

if (!structural && substantial) {
  console.log(
    JSON.stringify({
      followup_message:
        "APS stop: substantial session with no structural Knowledge OS paths. Finish with evidence labels (Verified / Partially verified / Not verified / Blocked / Assumed). Skip knowledge:check for non-structural edits." +
        routingNote,
    })
  );
  process.exit(0);
}

// Structural edits → refresh maps then enforce check
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npmOpts = {
  cwd: repoRoot,
  encoding: "utf8",
  env: process.env,
  timeout: 120_000,
};
const runNpmScript = (script) =>
  process.platform === "win32"
    ? spawnSync(`${npmCmd} run ${script}`, { ...npmOpts, shell: true })
    : spawnSync(npmCmd, ["run", script], npmOpts);

const update = runNpmScript("knowledge:update");
const check = runNpmScript("knowledge:check");
const quality = runNpmScript("quality:update");

const combined = [
  update.stderr,
  update.stdout,
  check.stderr,
  check.stdout,
  quality.stderr,
  quality.stdout,
]
  .filter(Boolean)
  .join("\n");
const out = trimOutput(combined);
const checkFailed =
  check.error ||
  (typeof check.status === "number" && check.status !== 0) ||
  update.error ||
  (typeof update.status === "number" && update.status !== 0 && update.status !== null);

const pathsHint = (session.touchedPaths || [])
  .filter((p) => typeof p === "string")
  .slice(0, 12)
  .join(", ");

if (checkFailed) {
  console.log(
    JSON.stringify({
      followup_message: [
        "Knowledge OS: HARD FAILURE — task is NOT complete.",
        `Structural paths touched: ${pathsHint || "(recorded)"}`,
        "Do not claim Verified until hard findings are fixed.",
        `See ${warningsRel}`,
        "Re-run: npm run knowledge:update && npm run knowledge:check",
        "",
        "Terminal output:",
        out || "(no output — check Hooks channel / npm availability)",
        "",
        "Then finish with evidence labels once knowledge:check PASSes (acknowledge any PK-WARN-* as PK-WARN-NNN: acknowledged — <reason>).",
      ].join("\n"),
    })
  );
  process.exit(0);
}

const hasSoftWarn = /WARN\s+PK-WARN-|soft=\s*[1-9]/i.test(combined);
const qualityLine = (combined.match(/project quality — [0-9.]+\/10/) || [])[0];
const qualityFailed =
  quality.error ||
  (typeof quality.status === "number" && quality.status !== 0 && quality.status !== null);

console.log(
  JSON.stringify({
    followup_message: [
      "Knowledge OS: knowledge:check PASS (hard rules).",
      hasSoftWarn
        ? "Soft PK-WARN-* remain — acknowledge as PK-WARN-NNN: acknowledged — <reason>. See " +
          warningsRel
        : "No soft warnings.",
      qualityFailed
        ? "Quality rubric: update FAILED — re-run npm run quality:update"
        : `Quality rubric: ${qualityLine || "score refreshed"} — see ${qualityRel}`,
      pathsHint ? `Structural paths: ${pathsHint}` : "",
      "",
      "Terminal output:",
      out,
      "",
      "Finish with evidence labels (Verified / Partially verified / Not verified / Blocked / Assumed)." +
        routingNote,
    ]
      .filter(Boolean)
      .join("\n"),
  })
);
process.exit(0);
