#!/usr/bin/env node
/**
 * Supply-chain scan.
 *
 * Exists because a 31,304-character obfuscated payload was found appended to
 * postcss.config.js (commit b0ab64c). It ran on every build, resolved a C2
 * host from Ethereum mainnet transaction data, and pulled a second stage.
 *
 * This project syncs from Lovable, so the same file can be reintroduced
 * outside of review. This scan runs in CI ahead of the build, before any
 * project code executes.
 *
 * Heuristics are deliberately narrow to stay quiet on legitimate code:
 * minified vendor bundles live in node_modules and dist, both skipped.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'ios', 'android', '.next', 'coverage',
]);

// Config and script files execute at build time; they are the payload's target.
const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.json']);

const MAX_LINE_LENGTH = 2000;

const SIGNATURES = [
  {
    id: 'hex-identifier-obfuscation',
    // Obfuscator.io-style output: _0x4963, _0xb40cd9
    pattern: /_0x[0-9a-f]{4,8}/g,
    threshold: 25,
    describe: (n) => `${n} hex-mangled identifiers (obfuscator.io signature)`,
  },
  {
    id: 'blockchain-c2',
    // Reaching Ethereum RPC/explorers from build tooling has no legitimate
    // use here and is the "EtherHiding" C2 pattern.
    pattern: /(1rpc\.io|drpc\.org|publicnode\.com|blastapi\.io|blockscout\.com|etherscan\.io|module=account&action=txlist)/gi,
    threshold: 1,
    describe: (n) => `${n} blockchain RPC/explorer reference(s)`,
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(extname(entry))) out.push(full);
  }
  return out;
}

const findings = [];

// This file necessarily contains the very strings it searches for.
const SELF = relative(ROOT, new URL(import.meta.url).pathname);

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);

  if (rel === SELF) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  // package-lock.json legitimately carries very long lines.
  if (rel !== 'package-lock.json') {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > MAX_LINE_LENGTH) {
        findings.push({
          file: rel,
          detail: `line ${i + 1} is ${lines[i].length} chars (limit ${MAX_LINE_LENGTH})`,
        });
      }
    }
  }

  for (const sig of SIGNATURES) {
    const count = (content.match(sig.pattern) || []).length;
    if (count >= sig.threshold) {
      findings.push({ file: rel, detail: `${sig.id}: ${sig.describe(count)}` });
    }
  }
}

if (findings.length > 0) {
  console.error('Supply-chain scan FAILED\n');
  for (const f of findings) console.error(`  ${f.file}\n    ${f.detail}`);
  console.error(
    '\nA build-time file looks tampered with. Do not run the build.' +
      '\nInspect the file, and check whether an upstream sync reintroduced it.'
  );
  process.exit(1);
}

console.log('Supply-chain scan passed — no obfuscated or blockchain-C2 payloads found.');
