import pg from 'pg';
import { attachDatabasePool } from '@neon/functions';

const { Pool, types } = pg;

// Postgres restituisce timestamptz come Date. Il frontend usa stringhe ISO.
types.setTypeParser(1184, (value: string) => new Date(value).toISOString());
types.setTypeParser(1114, (value: string) => new Date(`${value}Z`).toISOString());

// BIGSERIAL/BIGINT arrivano come stringhe: gli ID della demo stanno comodamente
// in un number e tutta la UI li tratta come numeri.
types.setTypeParser(20, (value: string) => Number(value));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL non presente: la Function deve girare su un branch Neon con Postgres.');
}

export const pool = new Pool({
  connectionString,
  max: 5,
  application_name: 'nebula-api',
});

// Evita che una disconnessione idle di node-postgres diventi un uncaughtException.
attachDatabasePool(pool);
