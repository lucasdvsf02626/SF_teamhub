#!/usr/bin/env node
/**
 * Codebase map generator.
 *
 * Extracts the shape of this project — routes, pages, database tables, edge
 * function inventory, dependency counts, largest files — into a single JSON
 * document, then renders a self-contained HTML page from it.
 *
 * The point is to be able to see the codebase without reading it, and to
 * regenerate that view for free after it changes.
 *
 *   npm run map        # writes codebase-map.json and codebase-map.html
 *
 * Both outputs are gitignored: they are derived, and regenerating is cheap.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const read = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ---- routes -----------------------------------------------------------
// App.tsx pairs `path="..."` with `element={<Page />}`, so capture both.
const appTsx = read('src/App.tsx');
const routes = [...appTsx.matchAll(/path="([^"]+)"[^>]*element=\{<([A-Za-z0-9_]+)/g)]
  .map((m) => ({ path: m[1], component: m[2] }))
  .filter((r, i, a) => a.findIndex((x) => x.path === r.path) === i)
  .sort((a, b) => a.path.localeCompare(b.path));

// ---- database ---------------------------------------------------------
const migrationDir = join(ROOT, 'supabase/migrations');
const migrations = existsSync(migrationDir) ? readdirSync(migrationDir).sort() : [];
const migrationSql = migrations.map((f) => readFileSync(join(migrationDir, f), 'utf8')).join('\n');

const tables = [
  ...new Set(
    [...migrationSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)]
      .map((m) => m[1].toLowerCase())
  ),
]
  // `create table for ...` style false positives from SQL comments.
  .filter((t) => t !== 'for' && t.length > 2)
  .sort();

// Group by prefix so 50+ tables stay readable.
const tableGroups = {};
for (const t of tables) {
  const key = t.startsWith('teamhub_')
    ? 'teamhub'
    : t.startsWith('hivemail_')
      ? 'hivemail'
      : t.startsWith('email_') || t.includes('email')
        ? 'email'
        : 'core';
  (tableGroups[key] ??= []).push(t);
}

// ---- edge functions ---------------------------------------------------
// Declared in config.toml; source is not in this repo by design.
const configToml = read('supabase/config.toml');
const functions = [...configToml.matchAll(/\[functions\.([a-z0-9-]+)\]([\s\S]*?)(?=\n\s*\[|$)/gi)].map(
  (m) => ({ name: m[1], verifyJwt: /verify_jwt\s*=\s*true/.test(m[2]) })
);

// ---- source stats -----------------------------------------------------
const srcFiles = walk(join(ROOT, 'src')).filter((f) => ['.ts', '.tsx'].includes(extname(f)));
const fileStats = srcFiles
  .map((f) => ({
    path: relative(ROOT, f),
    lines: readFileSync(f, 'utf8').split('\n').length,
  }))
  .sort((a, b) => b.lines - a.lines);

const pkg = JSON.parse(read('package.json') || '{}');

const map = {
  generatedFrom: 'scripts/codebase-map.mjs',
  app: { name: pkg.name, appId: (read('capacitor.config.ts').match(/appId:\s*'([^']+)'/) || [])[1] },
  totals: {
    routes: routes.length,
    pages: srcFiles.filter((f) => f.includes('/pages/')).length,
    components: srcFiles.filter((f) => f.includes('/components/')).length,
    hooks: srcFiles.filter((f) => f.includes('/hooks/')).length,
    sourceFiles: srcFiles.length,
    linesOfCode: fileStats.reduce((n, f) => n + f.lines, 0),
    tables: tables.length,
    migrations: migrations.length,
    edgeFunctions: functions.length,
    dependencies: Object.keys(pkg.dependencies || {}).length,
    devDependencies: Object.keys(pkg.devDependencies || {}).length,
  },
  routes,
  tableGroups,
  functions,
  largestFiles: fileStats.slice(0, 12),
  migrationRange: migrations.length
    ? { first: migrations[0].slice(0, 8), last: migrations.at(-1).slice(0, 8) }
    : null,
};

writeFileSync(join(ROOT, 'codebase-map.json'), JSON.stringify(map, null, 2) + '\n');
console.log('codebase-map.json written');
console.table(map.totals);
