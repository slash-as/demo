/**
 * Applica schema e seed Postgres al branch Neon collegato.
 *
 * Uso:
 *   npm run db:setup          schema + dati demo
 *   npm run db:migrate        solo schema
 *   npm run db:seed           solo dati demo
 *
 * Legge DATABASE_URL_UNPOOLED (connessione diretta, obbligatoria per DDL)
 * da .env.local, oppure dall'ambiente già popolato da `neon deploy`.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  process.loadEnvFile(join(root, '.env.local'));
} catch {
  // In CI o su Neon Functions le variabili arrivano già dall'ambiente.
}

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'DATABASE_URL_UNPOOLED / DATABASE_URL mancante. Esegui `neon deploy` o `neon env pull`.',
  );
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const schemaOnly = args.has('--schema-only');
const seedOnly = args.has('--seed-only');

const pool = new pg.Pool({
  connectionString,
  max: 1,
  application_name: 'nebula-db-setup',
});

try {
  if (!seedOnly) {
    const schema = await readFile(join(root, 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema nebula applicato.');
  }

  if (!schemaOnly) {
    const seed = await readFile(join(root, 'db', 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('Dati demo inseriti.');
  }

  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM nebula.users)    AS users,
      (SELECT COUNT(*)::int FROM nebula.posts)    AS posts,
      (SELECT COUNT(*)::int FROM nebula.comments) AS comments,
      (SELECT COUNT(*)::int FROM nebula.likes)    AS likes,
      (SELECT COUNT(*)::int FROM nebula.follows)  AS follows,
      (SELECT updated_at FROM nebula.revision WHERE id = 1) AS revision
  `);

  console.log('Stato database:', rows[0]);
} finally {
  await pool.end();
}
