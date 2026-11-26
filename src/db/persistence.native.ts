import { eq } from "drizzle-orm";
import { getDb, migrate } from "./client";
import * as T from "./schema";
import type { EntityKind, RawSnapshot } from "./persistence";

const TABLES = {
  tasks: T.tasks,
  reminders: T.reminders,
  wishlist: T.wishlist,
  notifications: T.notifications,
} as const;

export async function initStorage(): Promise<RawSnapshot> {
  await migrate();
  const db = getDb();
  const settings = Object.fromEntries(db.select().from(T.settings).all().map((x) => [x.key, x.value]));
  return {
    tasks: db.select().from(T.tasks).all(),
    reminders: db.select().from(T.reminders).all(),
    wishlist: db.select().from(T.wishlist).all(),
    notifications: db.select().from(T.notifications).all(),
    settings,
  };
}

export function saveSetting(key: string, value: string): void {
  getDb().insert(T.settings).values({ key, value }).onConflictDoUpdate({ target: T.settings.key, set: { value } }).run();
}

export function saveEntity(kind: EntityKind, row: any): void {
  const dbRow = kind === "tasks"
    ? { ...row, subtasks: JSON.stringify(row.subtasks ?? []), updatedAt: Date.now() }
    : { ...row, updatedAt: Date.now() };
  getDb().insert(TABLES[kind] as any).values(dbRow).onConflictDoUpdate({ target: (TABLES[kind] as any).id, set: dbRow }).run();
}

export function deleteEntity(kind: EntityKind, id: string): void {
  getDb().delete(TABLES[kind] as any).where(eq((TABLES[kind] as any).id, id)).run();
}

export function clearAllEntities(): void {
  const db = getDb();
  for (const k of Object.keys(TABLES) as EntityKind[]) {
    db.delete(TABLES[k] as any).run();
  }
}

export function clearNotificationEntities(): void {
  getDb().delete(T.notifications).run();
}
