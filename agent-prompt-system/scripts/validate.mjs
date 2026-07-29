#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const apsRoot = path.dirname(path.dirname(__filename))
let errors = 0
function fail(msg) {
  console.error('FAIL:', msg)
  errors++
}
function ok(msg) {
  console.log('OK:', msg)
}

const manifestPath = path.join(apsRoot, 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  fail('manifest.json missing')
  process.exit(1)
}

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
} catch (e) {
  fail('manifest.json parse: ' + e.message)
  process.exit(1)
}

if (!manifest.systemVersion || !manifest.schemaVersion) fail('manifest missing systemVersion/schemaVersion')
else ok(`manifest v${manifest.systemVersion} schema ${manifest.schemaVersion}`)

const ids = new Set()
for (const w of manifest.workflows || []) {
  if (!w.id) fail('workflow missing id')
  if (ids.has(w.id)) fail('duplicate workflow id: ' + w.id)
  ids.add(w.id)
  if (!w.path || w.path.includes('..') || path.isAbsolute(w.path)) fail('bad path for ' + w.id)
  const wp = path.join(apsRoot, w.path)
  if (!fs.existsSync(wp)) fail('missing workflow file: ' + w.path)
  else {
    const body = fs.readFileSync(wp, 'utf8')
    if (!body.includes(`id: ${w.id}`)) fail(`WORKFLOW.md frontmatter id mismatch: ${w.id}`)
    for (const ctx of w.required_context || []) {
      if (ctx.includes('..') || path.isAbsolute(ctx)) fail(`bad required_context ${ctx} in ${w.id}`)
      const cp = path.join(apsRoot, 'project-context', ctx)
      if (!fs.existsSync(cp)) fail(`missing project-context/${ctx} (required by ${w.id})`)
    }
  }
}
ok(`${ids.size} workflows unique and present`)

for (const w of manifest.workflows || []) {
  for (const c of w.compatible_with || []) {
    if (!ids.has(c)) fail(`compatible_with unknown id "${c}" on ${w.id}`)
  }
}
ok('compatible_with IDs valid')

for (const c of manifest.core || []) {
  if (c.includes('..') || path.isAbsolute(c)) fail('bad core path ' + c)
  if (!fs.existsSync(path.join(apsRoot, c))) fail('missing core ' + c)
}
ok('core files present')

for (const c of manifest.projectContext || []) {
  if (!fs.existsSync(path.join(apsRoot, 'project-context', c))) fail('missing project-context/' + c)
}
ok('project-context files present')

const adapter = manifest.adapter?.cursor?.template
if (!adapter || !fs.existsSync(path.join(apsRoot, adapter))) fail('missing cursor adapter template')
else ok('cursor adapter template present')

const readme = fs.readFileSync(path.join(apsRoot, 'README.md'), 'utf8')
for (const section of [
  'Overview',
  'Quick start',
  'How Cursor uses it',
  'Folder reference',
  'Adding a workflow',
  'Updating project context',
  'Portability',
  'Safety and privacy',
  'Maintenance',
  'Troubleshooting',
  'Uninstalling',
]) {
  if (!readme.includes(section)) fail('README missing section: ' + section)
}
ok('README sections present')

// Portable layers must not embed absolute host paths (Windows or POSIX home escapes)
const portableDirs = ['core', 'workflows', 'adapters', 'scripts', 'templates', 'examples']
const absPathRe = /(?:[A-Za-z]:\\(?:Users|home)\\|[A-Za-z]:\/(?:Users|home)\/|\/Users\/|\/home\/)/
for (const d of portableDirs) {
  const dir = path.join(apsRoot, d)
  if (!fs.existsSync(dir)) continue
  const walk = (p) => {
    for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, ent.name)
      if (ent.isDirectory()) walk(fp)
      else if (/\.(md|mdc|mjs|json)$/.test(ent.name)) {
        const t = fs.readFileSync(fp, 'utf8')
        if (absPathRe.test(t)) fail('absolute host path leak in ' + path.relative(apsRoot, fp))
      }
    }
  }
  walk(dir)
}
ok('no absolute host paths in portable layers')

/** Must match wording in adapter skill, .mdc, and context-selection.md */
const POINTER_RULE =
  'APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.'

const repoRoot = path.dirname(apsRoot)
const pointerSources = [
  path.join(apsRoot, 'adapters', 'cursor', 'skills', 'aps-router', 'SKILL.md'),
  path.join(apsRoot, 'adapters', 'cursor', 'agent-prompt-router.mdc'),
  path.join(apsRoot, 'core', 'context-selection.md'),
]
for (const fp of pointerSources) {
  if (!fs.existsSync(fp)) {
    fail('missing pointer-rule source: ' + path.relative(apsRoot, fp))
    continue
  }
  const body = fs.readFileSync(fp, 'utf8')
  if (!body.includes(POINTER_RULE)) {
    fail('pointer rule missing from ' + path.relative(apsRoot, fp))
  }
}
ok('pointer rule present in adapter skill, .mdc, and context-selection')

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

const generatedPairs = [
  {
    template: path.join(apsRoot, 'adapters', 'cursor', 'agent-prompt-router.mdc'),
    installed: path.join(repoRoot, '.cursor', 'rules', 'agent-prompt-router.mdc'),
  },
  {
    template: path.join(apsRoot, 'adapters', 'cursor', 'agent-bootstrap.mdc'),
    installed: path.join(repoRoot, '.cursor', 'rules', 'agent-bootstrap.mdc'),
  },
  {
    template: path.join(apsRoot, 'adapters', 'cursor', 'skills', 'aps-router', 'SKILL.md'),
    installed: path.join(repoRoot, '.cursor', 'skills', 'aps-router', 'SKILL.md'),
  },
  {
    template: path.join(apsRoot, 'adapters', 'cursor', 'hooks.json'),
    installed: path.join(repoRoot, '.cursor', 'hooks.json'),
  },
]

const hooksSrc = path.join(apsRoot, 'adapters', 'cursor', 'hooks')
for (const abs of listFilesRecursive(hooksSrc)) {
  const rel = path.relative(hooksSrc, abs)
  if (rel.startsWith('.') || /\.(bak-|aps-session|aps-routed-ack)/i.test(rel)) continue
  generatedPairs.push({
    template: abs,
    installed: path.join(repoRoot, '.cursor', 'hooks', rel),
  })
}

for (const { template, installed } of generatedPairs) {
  if (!fs.existsSync(template)) {
    fail('adapter APS artifact missing: ' + path.relative(apsRoot, template))
    continue
  }
  if (!fs.existsSync(installed)) {
    fail('installed APS artifact missing (run install.mjs): ' + path.relative(repoRoot, installed))
    continue
  }
  const t = fs.readFileSync(template, 'utf8')
  const i = fs.readFileSync(installed, 'utf8')
  if (t !== i) {
    fail(
      'installed APS artifact drifted from adapter (re-run install.mjs): ' +
        path.relative(repoRoot, installed)
    )
  } else if (
    installed.endsWith('agent-prompt-router.mdc') ||
    installed.endsWith(`${path.sep}aps-router${path.sep}SKILL.md`) ||
    installed.replace(/\\/g, '/').endsWith('aps-router/SKILL.md')
  ) {
    if (!i.includes(POINTER_RULE)) {
      fail('installed artifact missing pointer rule: ' + path.relative(repoRoot, installed))
    }
  }
}
ok(`installed .cursor APS copies match adapter templates (${generatedPairs.length} files)`)

// Example hooks.json must match SoT (no silent timeout drift)
const hooksExample = path.join(apsRoot, 'adapters', 'cursor', 'hooks.json.example')
const hooksSot = path.join(apsRoot, 'adapters', 'cursor', 'hooks.json')
if (fs.existsSync(hooksExample) && fs.existsSync(hooksSot)) {
  if (fs.readFileSync(hooksExample, 'utf8') !== fs.readFileSync(hooksSot, 'utf8')) {
    fail('adapters/cursor/hooks.json.example drifted from adapters/cursor/hooks.json')
  } else {
    ok('hooks.json.example matches hooks.json SoT')
  }
}

const substantialLib = path.join(hooksSrc, 'lib', 'substantial-prompt.mjs')
if (!fs.existsSync(substantialLib)) {
  fail('missing substantial-prompt.mjs shared heuristic')
} else {
  ok('shared substantial-prompt heuristic present')
}

const personasReadme = path.join(apsRoot, 'personas', 'AI_PERSONA_SYSTEM.md')
if (fs.existsSync(personasReadme)) {
  const body = fs.readFileSync(personasReadme, 'utf8')
  if (!/EXPERIMENTAL/i.test(body)) {
    fail('personas/AI_PERSONA_SYSTEM.md must declare EXPERIMENTAL lifecycle')
  } else {
    ok('personas marked EXPERIMENTAL')
  }
}

if (errors) {
  console.error(`\nvalidate: ${errors} error(s)`)
  console.error(
    'NOTE: validate checks packaging integrity / adapter↔install sync only — not agent compliance.'
  )
  process.exit(1)
}
console.log('\nvalidate: PASS (packaging integrity)')
console.log(
  'NOTE: This does NOT prove agents emitted APS briefs, selected correct workflows, or complied with evidence labels.'
)
