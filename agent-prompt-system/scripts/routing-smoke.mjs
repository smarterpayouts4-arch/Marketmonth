#!/usr/bin/env node
/**
 * Behavioral routing smoke:
 * 1) Fixture schema validation
 * 2) Substantial heuristic vs expect_substantial
 * 3) Session routing-state: reminder must NOT set routed:true
 * 4) Ack file may set routed:true when brief shape is valid
 *
 * Does NOT claim full agent cognition. Workflow selection fields are checklist metadata.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isSubstantialPrompt, looksLikeApsBrief } from '../adapters/cursor/hooks/lib/substantial-prompt.mjs'

const __filename = fileURLToPath(import.meta.url)
const apsRoot = path.dirname(path.dirname(__filename))
const fixturesPath = path.join(apsRoot, 'tests', 'routing-fixtures.json')
const hooksDir = path.join(apsRoot, 'adapters', 'cursor', 'hooks')

let errors = 0
function fail(msg) {
  console.error('FAIL:', msg)
  errors++
}
function ok(msg) {
  console.log('OK:', msg)
}

if (!fs.existsSync(fixturesPath)) {
  console.error('FAIL: missing', fixturesPath)
  process.exit(1)
}

let fixtures
try {
  fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'))
} catch (e) {
  console.error('FAIL: parse fixtures:', e.message)
  process.exit(1)
}

if (!Array.isArray(fixtures) || fixtures.length < 11) {
  fail('expected ≥11 fixtures covering the APS corpus')
}

const requiredKeys = [
  'id',
  'prompt',
  'expect_substantial',
  'primary_workflow',
  'allowed_supporting',
  'must_select',
  'must_not_select',
  'must_read',
  'must_not_stop_at',
  'routing_state',
  'verification',
  'reason',
]

const ids = new Set()
for (const f of fixtures) {
  for (const k of requiredKeys) {
    if (!(k in f)) fail(`fixture missing ${k}: ${f.id || '(no id)'}`)
  }
  if (f.id) {
    if (ids.has(f.id)) fail('duplicate fixture id ' + f.id)
    ids.add(f.id)
  }
  for (const arr of [
    'must_select',
    'must_not_select',
    'must_read',
    'must_not_stop_at',
    'allowed_supporting',
  ]) {
    if (f[arr] && !Array.isArray(f[arr])) fail(`${f.id}.${arr} must be an array`)
  }
  if (typeof f.expect_substantial !== 'boolean') {
    fail(`${f.id}.expect_substantial must be boolean`)
  }
  if (f.allowed_supporting && f.allowed_supporting.length > 2) {
    fail(`${f.id}: allowed_supporting must be ≤2 (primary + ≤2 support = ≤3 total)`)
  }
}

ok(`fixture schema (${fixtures.length} fixtures)`)

// Heuristic matrix
for (const f of fixtures) {
  const actual = isSubstantialPrompt(f.prompt)
  if (actual !== f.expect_substantial) {
    fail(
      `substantial mismatch ${f.id}: expect=${f.expect_substantial} actual=${actual} (len=${String(f.prompt).length})`
    )
  }
}
ok('substantial heuristic matches expect_substantial for all fixtures')

if (!looksLikeApsBrief('Selected workflows: implement-feature, test-and-verify')) {
  fail('looksLikeApsBrief rejected a valid brief')
}
if (looksLikeApsBrief('I will implement the feature now')) {
  fail('looksLikeApsBrief accepted a non-brief')
}
ok('APS brief shape helper')

// Required corpus coverage (by id prefix / tags in reason)
const requiredIds = [
  'short-engineering-add',
  'long-engineering-implement',
  'docs-only-knowledge',
  'idea-lab-brain',
  'discovery-feature',
  'seo-improve',
  'api-route',
  'cross-functional-ambiguous',
  'non-engineering-chat',
  'misleading-keyword-docs',
  'one-workflow-toolchain',
  'two-workflow-debug-test',
  'three-workflow-security',
]
for (const id of requiredIds) {
  if (!ids.has(id)) fail('missing required corpus fixture: ' + id)
}
ok('required corpus fixtures present')

/**
 * Run a hook script with JSON stdin in an isolated temp hooks dir
 * (session marker lives next to the hook).
 */
function runHookIsolated(hookFileName, stdinObj) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aps-hook-'))
  const libSrc = path.join(hooksDir, 'lib')
  const libDst = path.join(tmp, 'lib')
  fs.mkdirSync(libDst, { recursive: true })
  for (const name of fs.readdirSync(libSrc)) {
    fs.copyFileSync(path.join(libSrc, name), path.join(libDst, name))
  }
  const hookSrc = path.join(hooksDir, hookFileName)
  const hookDst = path.join(tmp, hookFileName)
  fs.copyFileSync(hookSrc, hookDst)

  const r = spawnSync(process.execPath, [hookDst], {
    input: JSON.stringify(stdinObj),
    encoding: 'utf8',
    cwd: tmp,
  })
  const markerPath = path.join(tmp, '.aps-session.json')
  let session = null
  if (fs.existsSync(markerPath)) {
    session = JSON.parse(fs.readFileSync(markerPath, 'utf8'))
  }
  return { status: r.status, stdout: r.stdout || '', session, tmp }
}

// beforeSubmit substantial → routed false
{
  const { status, stdout, session, tmp } = runHookIsolated('aps-before-submit.mjs', {
    prompt:
      'Investigate the API route and document how agents should use project-knowledge ask.',
  })
  if (status !== 0) fail('before-submit exited non-zero')
  if (!session?.substantial) fail('before-submit should mark substantial')
  if (session.routed) fail('before-submit must leave routed=false')
  if (!String(stdout).includes('Selected workflows')) {
    fail('before-submit should inject agent_message mentioning Selected workflows')
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  ok('before-submit: substantial + routed=false')
}

// preToolUse reminder must not set routed
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aps-pre-'))
  const libSrc = path.join(hooksDir, 'lib')
  const libDst = path.join(tmp, 'lib')
  fs.mkdirSync(libDst, { recursive: true })
  for (const name of fs.readdirSync(libSrc)) {
    fs.copyFileSync(path.join(libSrc, name), path.join(libDst, name))
  }
  fs.copyFileSync(path.join(hooksDir, 'aps-pre-tool-use.mjs'), path.join(tmp, 'aps-pre-tool-use.mjs'))
  fs.writeFileSync(
    path.join(tmp, '.aps-session.json'),
    JSON.stringify({
      substantial: true,
      routed: false,
      reminderEmitted: false,
      touchedPaths: [],
    }),
    'utf8'
  )
  const r = spawnSync(process.execPath, [path.join(tmp, 'aps-pre-tool-use.mjs')], {
    input: JSON.stringify({
      tool_name: 'Write',
      tool_input: { path: 'src/brain/evaluation/generate-topic-candidates.ts' },
    }),
    encoding: 'utf8',
  })
  const session = JSON.parse(fs.readFileSync(path.join(tmp, '.aps-session.json'), 'utf8'))
  if (r.status !== 0) fail('pre-tool-use exited non-zero')
  if (session.routed) fail('pre-tool-use must NOT set routed=true after reminder')
  if (!session.reminderEmitted) fail('pre-tool-use should set reminderEmitted')
  if (!String(r.stdout).includes('does not mark routing complete')) {
    fail('pre-tool-use reminder must state it does not complete routing')
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  ok('pre-tool-use: reminder does not set routed')
}

// Ack file can set routed
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aps-ack-'))
  const libSrc = path.join(hooksDir, 'lib')
  const libDst = path.join(tmp, 'lib')
  fs.mkdirSync(libDst, { recursive: true })
  for (const name of fs.readdirSync(libSrc)) {
    fs.copyFileSync(path.join(libSrc, name), path.join(libDst, name))
  }
  fs.copyFileSync(path.join(hooksDir, 'aps-pre-tool-use.mjs'), path.join(tmp, 'aps-pre-tool-use.mjs'))
  fs.writeFileSync(
    path.join(tmp, '.aps-session.json'),
    JSON.stringify({
      substantial: true,
      routed: false,
      reminderEmitted: true,
      touchedPaths: [],
    }),
    'utf8'
  )
  fs.writeFileSync(
    path.join(tmp, '.aps-routed-ack.json'),
    JSON.stringify({
      brief: 'Selected workflows: investigate-codebase, test-and-verify',
    }),
    'utf8'
  )
  const r = spawnSync(process.execPath, [path.join(tmp, 'aps-pre-tool-use.mjs')], {
    input: JSON.stringify({
      tool_name: 'Write',
      tool_input: { path: 'README.md' },
    }),
    encoding: 'utf8',
  })
  const session = JSON.parse(fs.readFileSync(path.join(tmp, '.aps-session.json'), 'utf8'))
  if (r.status !== 0) fail('pre-tool-use (ack) exited non-zero')
  if (!session.routed) fail('valid .aps-routed-ack.json must set routed=true')
  if (String(r.stdout).includes('agent_message')) {
    // when routed, no reminder needed
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  ok('pre-tool-use: ack brief sets routed=true')
}

console.log('\n--- Fixture checklist (workflow expectations are advisory metadata) ---\n')
for (const f of fixtures) {
  console.log(`## ${f.id}`)
  console.log(`prompt: ${f.prompt}`)
  console.log(`expect_substantial: ${f.expect_substantial}`)
  console.log(`primary_workflow: ${f.primary_workflow}`)
  if (f.allowed_supporting?.length) {
    console.log(`allowed_supporting: ${f.allowed_supporting.join(' | ')}`)
  }
  console.log(`routing_state: ${f.routing_state}`)
  console.log(`verification: ${f.verification}`)
  console.log(`reason: ${f.reason}`)
  console.log('')
}

if (errors) {
  console.error(`\nrouting-smoke: ${errors} error(s)`)
  process.exit(1)
}
console.log(`routing-smoke: PASS (${fixtures.length} fixtures; heuristic + session routing checks)`)
console.log(
  'NOTE: Workflow selection fields are not auto-asserted against a live agent — use as checklist.'
)
