#!/usr/bin/env node
/**
 * Scaffold or refresh project-context files from templates.
 * Does NOT claim full understanding of the product.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const apsRoot = path.dirname(path.dirname(__filename))
const ctxDir = path.join(apsRoot, 'project-context')
const force = process.argv.includes('--force')

const FILES = [
  'PROJECT.md',
  'ARCHITECTURE.md',
  'PRODUCT.md',
  'COMMANDS.md',
  'DESIGN-SYSTEM.md',
  'DATA-FLOWS.md',
  'PROTECTED-AREAS.md',
  'KNOWN-RISKS.md',
  'DEFINITION-OF-DONE.md',
]

const scaffold = (name) => `# ${name.replace('.md', '')}

> Scaffolded by initialize-project-context.mjs — **human review required**.
> This script does not understand your product. Replace bullets with pointer-heavy truths.

## Summary

TODO: one paragraph for agents.

## Canonical sources

- TODO: link AGENTS / START_HERE / architecture docs

## Agent notes

- TODO
- Mark facts as Verified / Listed / Unknown

## Do not

- Store secrets
- Duplicate entire policy documents
`

fs.mkdirSync(ctxDir, { recursive: true })
const actions = []

for (const name of FILES) {
  const target = path.join(ctxDir, name)
  const exists = fs.existsSync(target)
  if (!exists) {
    fs.writeFileSync(target, scaffold(name), 'utf8')
    actions.push('created ' + name)
  } else if (force) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.copyFileSync(target, target + '.bak-' + stamp)
    fs.writeFileSync(target, scaffold(name), 'utf8')
    actions.push('refreshed (backed up) ' + name)
  } else {
    actions.push('kept ' + name)
  }
}

console.log('initialize-project-context:')
for (const a of actions) console.log('  ', a)
console.log(`\nReview checklist (human):
  [ ] PROJECT.md points at real agent entry docs
  [ ] PRODUCT.md states identity + forbidden claims accurately
  [ ] COMMANDS.md lists real scripts; mark Verified vs Listed
  [ ] PROTECTED-AREAS.md lists secrets, scrapers, policy SoTs
  [ ] KNOWN-RISKS.md includes port/runtime gotchas
  [ ] DEFINITION-OF-DONE.md points at existing gates (do not invent policy)
  [ ] Run: node agent-prompt-system/scripts/validate.mjs

This script does NOT claim the project is fully understood.`)
