#!/usr/bin/env node
/**
 * beforeSubmitPrompt — remind APS routing for substantial prompts.
 * Fail-open: never block the user; never log secrets.
 *
 * Session semantics:
 * - substantial: heuristic match
 * - routed: false until a real routing acknowledgment exists (never set here)
 * - reminderEmitted: set false on new prompt; preToolUse may set true after warn
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isSubstantialPrompt } from './lib/substantial-prompt.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const markerPath = path.join(__dirname, '.aps-session.json')

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve('{}'))
  })
}

const raw = await readStdin()
let payload = {}
try {
  payload = JSON.parse(raw || '{}')
} catch {
  payload = {}
}

const prompt = String(payload.prompt || '')
const substantial = isSubstantialPrompt(prompt)

try {
  fs.writeFileSync(
    markerPath,
    JSON.stringify(
      {
        substantial,
        at: new Date().toISOString(),
        routed: false,
        reminderEmitted: false,
        touchedPaths: [],
      },
      null,
      0
    ),
    'utf8'
  )
} catch {
  /* ignore */
}

if (substantial) {
  console.log(
    JSON.stringify({
      continue: true,
      agent_message:
        'APS: Substantial prompt detected. Open the user-visible APS brief in your first paragraph: `Selected workflows: …` (≤3). Then read agent-prompt-system/manifest.json + core/request-router.md, load required project-context, emit a short task spec, finish with Verified/Partially verified/Not verified/Blocked/Assumed. Note: this reminder is not routing confirmation.',
    })
  )
} else {
  console.log(JSON.stringify({ continue: true }))
}
process.exit(0)
