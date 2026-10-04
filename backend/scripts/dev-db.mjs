/**
 * Lokāls PostgreSQL izstrādei bez Docker un bez sistēmas instalācijas.
 * Bināros failus piegādā npm pakotne embedded-postgres; dati glabājas backend/.pgdata.
 *
 *   npm run db        (Ctrl+C - aptur)
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tās pašas vērtības, ko lieto backend (.env, ja tāds ir)
const env = { ...process.env };
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
}

const dataDir = join(root, '.pgdata');
const port = Number(env.DB_PORT ?? 5432);
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: env.DB_USER ?? 'postgres',
  password: env.DB_PASSWORD ?? 'postgres',
  port,
  persistent: true,
  // Bez šī Windows inicializē datubāzi WIN1252 kodējumā un latviešu burti nesaglabājas
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(join(dataDir, 'PG_VERSION'))) {
  console.log('Inicializē datubāzi...');
  await pg.initialise();
}
await pg.start();

for (const name of [env.DB_NAME ?? 'document_registry', env.TEST_DB_NAME ?? 'document_registry_test']) {
  try {
    await pg.createDatabase(name);
    console.log(`Izveidota datubāze ${name}`);
  } catch {
    // jau eksistē
  }
}

console.log(`PostgreSQL darbojas uz localhost:${port}. Ctrl+C - apturēt.`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
