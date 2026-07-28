#!/usr/bin/env node
/**
 * Install Cursor APS artifacts from adapter SoT:
 *   adapters/cursor/agent-prompt-router.mdc → .cursor/rules/
 *   adapters/cursor/skills/aps-router/SKILL.md → .cursor/skills/aps-router/
 *   adapters/cursor/hooks.json → .cursor/hooks.json
 *   adapters/cursor/hooks/* → .cursor/hooks/
 * Do not hand-edit installed copies — edit adapters, then re-run this script.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const scriptsDir = path.dirname(__filename)
const apsRoot = path.dirname(scriptsDir)

function findRepoRoot(start) {
  let dir = start
  for (;;) {
    if (fs.existsSync(path.join(dir, 'agent-prompt-system', 'manifest.json'))) return dir
    if (fs.existsSync(path.join(dir, 'manifest.json')) && path.basename(dir) === 'agent-prompt-system') {
      return path.dirname(dir)
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * @param {string} templatePath
 * @param {string} targetPath
 * @returns {{ wrote: string, backup: string | false }}
 */
function installFile(templatePath, targetPath) {
  if (!fs.existsSync(templatePath)) {
    console.error('install: missing template', templatePath)
    process.exit(1)
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  const nextBody = fs.readFileSync(templatePath, 'utf8')
  // No on-disk .bak-* sidecars — previous content is recoverable from git.
  fs.writeFileSync(targetPath, nextBody, 'utf8')
  return { wrote: targetPath, backup: false }
}

/** @param {string} dir @returns {string[]} */
function listFilesRecursive(dir) {
  /** @type {string[]} */
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...listFilesRecursive(fp))
    else out.push(fp)
  }
  return out
}

const repoRoot = findRepoRoot(apsRoot)
if (!repoRoot) {
  console.error('install: could not find repository root containing agent-prompt-system/')
  process.exit(1)
}

const adapterCursor = path.join(apsRoot, 'adapters', 'cursor')
const artifacts = [
  {
    template: path.join(adapterCursor, 'agent-prompt-router.mdc'),
    target: path.join(repoRoot, '.cursor', 'rules', 'agent-prompt-router.mdc'),
  },
  {
    template: path.join(adapterCursor, 'agent-bootstrap.mdc'),
    target: path.join(repoRoot, '.cursor', 'rules', 'agent-bootstrap.mdc'),
  },
  {
    template: path.join(adapterCursor, 'skills', 'aps-router', 'SKILL.md'),
    target: path.join(repoRoot, '.cursor', 'skills', 'aps-router', 'SKILL.md'),
  },
  {
    template: path.join(adapterCursor, 'hooks.json'),
    target: path.join(repoRoot, '.cursor', 'hooks.json'),
  },
]

const hooksSrc = path.join(adapterCursor, 'hooks')
for (const abs of listFilesRecursive(hooksSrc)) {
  const rel = path.relative(hooksSrc, abs)
  // Do not install session/ack runtime files if ever present under adapter
  if (rel.startsWith('.') || rel.includes(`${path.sep}.`)) continue
  if (/\.(bak-|aps-session|aps-routed-ack)/i.test(rel)) continue
  artifacts.push({
    template: abs,
    target: path.join(repoRoot, '.cursor', 'hooks', rel),
  })
}

const advisorRule = path.join(repoRoot, '.cursor', 'rules', 'advisor-chat-response-composition.mdc')
const results = artifacts.map(({ template, target }) => installFile(template, target))

console.log('Agent Prompt System install OK')
console.log('  repo:', repoRoot)
for (const r of results) {
  console.log('  wrote:', path.relative(repoRoot, r.wrote))
  if (r.backup) console.log('  backup:', path.relative(repoRoot, r.backup))
}
console.log('  advisor rule present (untouched):', fs.existsSync(advisorRule) ? 'yes' : 'n/a')
console.log('  note: edit adapters/cursor/*, then re-run install — do not hand-edit .cursor APS copies')
console.log('  note: install proves file sync only — not agent compliance')
