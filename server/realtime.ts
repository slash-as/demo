import { createRealtime, rawSql } from '@neon/realtime/server';

const secret = process.env.NEON_REALTIME_SECRET;
const databaseUrl = process.env.DATABASE_URL;

const database = databaseUrl
  ? new URL(databaseUrl).pathname.replace(/^\/+/, '') || 'neondb'
  : 'neondb';

const realtime = secret ? createRealtime({ secret, db: database }) : null;

export function realtimeConfigured(): boolean {
  return Boolean(realtime);
}

export interface RevisionRow {
  id: number;
  updated_at: string;
}

/**
 * La tabella revision ha una sola riga, aggiornata da trigger su ogni
 * scrittura di Nebula. Sottoscrivendola, il client riceve un evento per
 * like, commenti, follow, post e profili senza esporre query arbitrarie.
 */
export async function sealRevisionQuery() {
  if (!realtime) {
    throw new Error('Neon Realtime non configurato su questo branch.');
  }

  return realtime.seal({
    query: rawSql<RevisionRow>(
      'SELECT id, updated_at FROM nebula.revision WHERE id = 1',
    ),
  });
}
