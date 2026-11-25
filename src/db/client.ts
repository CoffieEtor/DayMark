import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import * as schema from "./schema";

let expoDb: SQLiteDatabase | null = null;
let _db: ExpoSQLiteDatabase<typeof schema> | null = null;

export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (!_db) throw new Error("Database not initialized. Call migrate() first.");
  return _db;
}

// Append-only migration list. PRAGMA user_version records how many have run, so app updates never lose data.
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'normal', due TEXT NOT NULL DEFAULT '', done INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, desc TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, time TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, nid TEXT, updated_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, desc TEXT NOT NULL DEFAULT '', price REAL NOT NULL DEFAULT 0, url TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', purchased INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  `ALTER TABLE tasks ADD COLUMN due_time TEXT NOT NULL DEFAULT '';
   ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT '';
   ALTER TABLE tasks ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE wishlist ADD COLUMN notes TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE tasks ADD COLUMN subtasks TEXT NOT NULL DEFAULT '[]';
   ALTER TABLE wishlist ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';`,
];
export async function migrate() {
  if (!expoDb) {
    expoDb = await openDatabaseAsync("daymark.db");
    _db = drizzle(expoDb, { schema });
  }
  const v = (await expoDb.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))?.user_version ?? 0;
  for (let i = v; i < MIGRATIONS.length; i++) {
    await expoDb.execAsync(MIGRATIONS[i]);
    await expoDb.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}
