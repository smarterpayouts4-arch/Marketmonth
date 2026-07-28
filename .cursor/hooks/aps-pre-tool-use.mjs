#!/usr/bin/env node
/**
 * preToolUse (Write/StrReplace) — track touched paths + soft APS routing reminder.
 * Fail-open (always allow). Never log file contents.
 *
 * Routing-state correctness:
 * - Emitting a reminder MUST NOT set routed: true.
 * - routed stays false unless an explicit ack artifact exists (see markRoutedIfAcked).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractToolPath, normalizeRel } from './lib/knowledge-structural.mjs'
import { looksLikeApsBrief } from './lib/substantial-prompt.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const markerPath = path.join(__dirname, '.aps-session.json')
const ackPath = path.join(__dirname, '.aps-routed-ack.json')

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', () => resolve('{}'))
  })
}

/** @param {Record<string, unknown>} session */
function markRoutedIfAcked(session) {
  try {
    if (!fs.existsSync(ackPath)) return session
    const ack = JSON.parse(fs.readFileSync(ackPath, 'utf8'))
    const brief = String(ack.brief || ack.apsBrief || '')
    if (looksLikeApsBrief(brief)) {
      session.routed = true
      session.routedAt = new Date().toISOString()
      session.routedVia = 'aps-routed-ack'
    }
  } catch {
    /* ignore invalid ack */
  }
  return session
}

const raw = await readStdin()
let payload = {}
try {
  payload = JSON.parse(raw || '{}')
} catch {
  payload = {}
}

let session = {
  substantial: false,
  routed: false,
  reminderEmitted: false,
  touchedPaths: [],
}
try {
  session = {
    substantial: false,
    routed: false,
    reminderEmitted: false,
    touchedPaths: [],
    ...JSON.parse(fs.readFileSync(markerPath, 'utf8')),
  }
} catch {
  /* no session marker yet — still track paths */
}

session.routed = Boolean(session.routed)
session.reminderEmitted = Boolean(session.reminderEmitted)
markRoutedIfAcked(session)

const filePath = extractToolPath(payload)
if (filePath) {
  const touched = Array.isArray(session.touchedPaths) ? session.touchedPaths : []
  const n = normalizeRel(filePath)
  if (n && !touched.includes(n)) touched.push(n)
  session.touchedPaths = touched.slice(-200)
}

let agentMessage
if (session.substantial && !session.routed) {
  // Reminder alone never flips routed. Re-emit until ack or session ends.
  session.reminderEmitted = true
  agentMessage =
    'APS reminder: state Selected workflows and task-spec acceptance/verification if you have not already. Prefer surgical edits; label completion evidence. Emitting this reminder does not mark routing complete.'
}

try {
  fs.writeFileSync(markerPath, JSON.stringify(session), 'utf8')
} catch {
  /* ignore */
}

if (agentMessage) {
  console.log(JSON.stringify({ permission: 'allow', agent_message: agentMessage }))
} else {
  console.log(JSON.stringify({ permission: 'allow' }))
}
process.exit(0)
