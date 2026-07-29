#!/usr/bin/env node
/**
 * Local + CI stabilization gate. Exit criteria evidence command.
 */
import { spawnSync } from "node:child_process";

function run(label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("typecheck", "npm", ["run", "typecheck"]);
run("lint", "npm", ["run", "lint"]);
run("unit+integration tests", "npm", ["test"]);
run("brain cycles", "node", ["scripts/check-brain-cycles.mjs"]);
run("validate:cursor-context", "npm", ["run", "validate:cursor-context"]);
run("knowledge:update", "npm", ["run", "knowledge:update"]);
run("mcp:test", "npm", ["run", "mcp:test"]);
run("knowledge:check", "npm", ["run", "knowledge:check"]);

console.log("\nPASS validate:stabilization");
