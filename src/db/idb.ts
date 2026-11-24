/**
 * Micro-wrapper attorno a IndexedDB.
 *
 * SQL.js tiene il database in memoria: dopo ogni scrittura esportiamo
 * il file SQLite (Uint8Array) e lo salviamo qui. All'avvio lo rileggiamo.
 * Nessun backend, nessun localStorage: solo IndexedDB.
 */

const DB_NAME = 'nebula-demo';
const STORE_NAME = 'files';
const DATABASE_KEY = 'nebula.sqlite';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDatabaseFile(): Promise<Uint8Array | null> {
  const db = await openIndexedDb();

  try {
    return await new Promise<Uint8Array | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(DATABASE_KEY);

      request.onsuccess = () => {
        const value: unknown = request.result;
        if (value instanceof Uint8Array) resolve(value);
        else if (value instanceof ArrayBuffer) resolve(new Uint8Array(value));
        else resolve(null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDatabaseFile(bytes: Uint8Array): Promise<void> {
  const db = await openIndexedDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(bytes, DATABASE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteDatabaseFile(): Promise<void> {
  const db = await openIndexedDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(DATABASE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
