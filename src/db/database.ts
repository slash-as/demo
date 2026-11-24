import initSqlJs from 'sql.js';
import type { BindParams, Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { deleteDatabaseFile, loadDatabaseFile, saveDatabaseFile } from './idb';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

let sql: SqlJsStatic | null = null;
let db: SqlJsDatabase | null = null;

/**
 * Le scritture vengono accodate: IndexedDB è asincrono e due salvataggi
 * concorrenti potrebbero sovrascriversi a vicenda.
 */
let saveQueue: Promise<void> = Promise.resolve();

function requireDb(): SqlJsDatabase {
  if (!db) throw new Error('Database non inizializzato.');
  return db;
}

/**
 * SQL.js lavora in memoria. `export()` restituisce il file SQLite completo,
 * che poi salviamo in IndexedDB. Da notare: export() chiude e riapre la
 * connessione, quindi va riattivato il vincolo delle foreign key.
 */
function persist(): Promise<void> {
  const database = requireDb();
  const bytes = database.export();
  database.run('PRAGMA foreign_keys = ON;');

  saveQueue = saveQueue
    .then(() => saveDatabaseFile(bytes))
    .catch((error: unknown) => {
      console.error('[Nebula] Salvataggio su IndexedDB fallito', error);
    });

  return saveQueue;
}

export async function openDatabase(): Promise<void> {
  if (!sql) {
    sql = await initSqlJs({
      locateFile: () => wasmUrl,
      useOldExtensionFunctions: true,
    });
  }

  const saved = await loadDatabaseFile();
  let restored = false;

  if (saved) {
    try {
      db = new sql.Database(saved);
      restored = true;
    } catch (error) {
      console.warn('[Nebula] Database salvato illeggibile, riparto da zero.', error);
      await deleteDatabaseFile();
    }
  }

  if (!db) {
    db = new sql.Database();
    db.run(SCHEMA_SQL);
    seedDatabase(db);
  }

  db.run('PRAGMA foreign_keys = ON;');

  // Primo avvio (o reset): salviamo subito lo stato iniziale.
  if (!restored) await persist();
}

export function all<T>(sqlText: string, params: BindParams = []): T[] {
  const statement = requireDb().prepare(sqlText);

  try {
    statement.bind(params);
    const rows: T[] = [];

    while (statement.step()) {
      rows.push(statement.getAsObject() as unknown as T);
    }

    return rows;
  } finally {
    statement.free();
  }
}

export function get<T>(sqlText: string, params: BindParams = []): T | undefined {
  return all<T>(sqlText, params)[0];
}

/**
 * Esegue una scrittura e restituisce l'ID generato.
 * L'ID viene letto PRIMA di `persist()`, perché export() riapre la
 * connessione e azzera `last_insert_rowid()`.
 */
export function run(sqlText: string, params: BindParams = []): number {
  const database = requireDb();
  database.run(sqlText, params);

  const result = database.exec('SELECT last_insert_rowid() AS id;');
  const generatedId = Number(result[0]?.values[0]?.[0] ?? 0);

  void persist();
  return generatedId;
}

export function exportBytes(): Uint8Array {
  const database = requireDb();
  const bytes = database.export();
  database.run('PRAGMA foreign_keys = ON;');
  return bytes;
}

export async function resetDatabase(): Promise<void> {
  await saveQueue;
  db?.close();
  db = null;
  await deleteDatabaseFile();
  await openDatabase();
}

export function flushDatabase(): Promise<void> {
  return saveQueue;
}
