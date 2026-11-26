import type { EntityKind, RawSnapshot } from "./persistence";

const STORAGE_KEY = "daymarked.web.v1";

function emptySnapshot(): RawSnapshot {
  return { tasks: [], reminders: [], wishlist: [], notifications: [], settings: {} };
}

let memoryFallback: RawSnapshot = emptySnapshot();

function readWeb(): RawSnapshot {
  try {
    if (typeof window === "undefined" || !window.localStorage) return memoryFallback;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {},
    };
  } catch {
    return memoryFallback;
  }
}

function writeWeb(data: RawSnapshot): void {
  memoryFallback = data;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Keep memoryFallback if localStorage quota or private mode blocks writes.
  }
}

export async function initStorage(): Promise<RawSnapshot> {
  const data = readWeb();
  memoryFallback = data;
  return data;
}

export function saveSetting(key: string, value: string): void {
  const data = readWeb();
  data.settings = { ...data.settings, [key]: value };
  writeWeb(data);
}

export function saveEntity(kind: EntityKind, row: any): void {
  const data = readWeb();
  const list = data[kind];
  const exists = list.some((item: any) => item.id === row.id);
  data[kind] = exists ? list.map((item: any) => (item.id === row.id ? row : item)) : [row, ...list];
  writeWeb(data);
}

export function deleteEntity(kind: EntityKind, id: string): void {
  const data = readWeb();
  data[kind] = data[kind].filter((item: any) => item.id !== id);
  writeWeb(data);
}

export function clearAllEntities(): void {
  const data = readWeb();
  writeWeb({ tasks: [], reminders: [], wishlist: [], notifications: [], settings: data.settings });
}

export function clearNotificationEntities(): void {
  const data = readWeb();
  writeWeb({ ...data, notifications: [] });
}
