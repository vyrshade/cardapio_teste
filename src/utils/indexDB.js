import { openDB } from 'idb';

const DB_NAME = 'pecaja-db';
const STORE_NAME = 'usr';

export async function initDB() {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function save(data) {
  const db = await initDB();
  await db.put(STORE_NAME, data);
}

export async function get(id) {
  const db = await initDB();
  return await db.get(STORE_NAME, id);
}

export async function clear() {
  const db = await initDB();
  await db.clear(STORE_NAME);
}

export async function getAll() {
  const db = await initDB();
  return await db.getAll(STORE_NAME);
}