/* ================================================================
   [VERIFY BETA BUILD] — runs automatically after `npm run build:beta`
   and `npm run electron:build:beta`, and refuses to let a build through
   that carries this machine's own cloud config out to other people.

   Why this exists (2026-07-28): a network probe of a plain `npm run
   build` bundle showed the running app calling
   `https://<project>.supabase.co/rest/v1/library_documents` on startup,
   unprompted — because a default build reads `.env.local`, which holds
   the dev machine's real project URL and key. That is CORRECT for the
   dev instance and completely wrong for anything handed to a beta
   tester: it would phone a cloud service they never agreed to, and bake
   a key into an installer.

   `.env.beta` already empties those variables, so `build:beta` is
   clean — the gap was never the config, it was that ONE mistyped script
   (`electron:build` instead of `electron:build:beta`) silently produces
   a poisoned installer that looks identical. So this makes it loud.

   Standing decision it enforces: local and self-hosted, off Supabase —
   a beta build must run with no cloud account at all.
   ================================================================ */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/assets';
const problems = [];

if (!existsSync(DIST)) {
  console.error('✗ beta verify: no dist/assets — did the build actually run?');
  process.exit(1);
}

/* Each rule is a thing that must NOT appear in a build meant for someone
   else's machine. Kept narrow on purpose: in-game links to arXiv, Project
   Gutenberg and the like are legitimate and must keep working. */
const FORBIDDEN = [
  [/[a-z0-9-]+\.supabase\.co/gi, 'a Supabase project host — this build would phone home'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, 'something shaped like a JWT / API key'],
  [/sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}/g, 'a Supabase key'],
  [/\bminioadmin\b/g, 'MinIO credentials'],
];

const files = readdirSync(DIST).filter(f => f.endsWith('.js'));
if (!files.length) problems.push('dist/assets holds no .js at all — the build looks empty');

for (const f of files) {
  const src = readFileSync(join(DIST, f), 'utf8');
  for (const [re, what] of FORBIDDEN) {
    const hits = src.match(re);
    if (hits) problems.push(`${f}: ${what} (${[...new Set(hits)].slice(0, 2).join(', ')})`);
  }
}

if (problems.length) {
  console.error('\n✗ THIS BUILD MUST NOT BE SHIPPED — it carries this machine\'s own config:\n');
  for (const p of problems) console.error('   · ' + p);
  console.error('\n  A beta build has to run with no cloud account at all. Build it with');
  console.error('  `npm run build:beta` / `npm run electron:build:beta` (which read .env.beta),');
  console.error('  not the plain `build` / `electron:build` scripts (which read .env.local).\n');
  process.exit(1);
}

console.log(`✓ beta build verified — ${files.length} bundle file(s), no cloud host, no keys, local-only.`);
