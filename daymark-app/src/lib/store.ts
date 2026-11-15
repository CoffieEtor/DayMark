import { useSyncExternalStore } from "react";
import Storage from "expo-sqlite/kv-store";
import * as Notifications from "expo-notifications";

import { type Persisted, type Reminder, type Task, type Wish, normalizePersisted, reminderWhen, mergeById, parseBackup, exportBackup, money as fmt, dateStr } from "./logic";
import { setHapticsEnabled } from "../haptics";

export type { Priority, Task, Reminder, Wish } from "./logic";
export { PRI } from "./logic";
type State = Persisted & { ready: boolean; error: string };

let state: State = { ...normalizePersisted(null), ready: false, error: "" };
const subs = new Set<() => void>();
const KEY = "daymark.v1";
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const useStore = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);

async function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
  try {
    const { tasks, reminders, wishlist, name, notify, currency, haptics } = state;
    await Storage.setItem(KEY, JSON.stringify({ tasks, reminders, wishlist, name, notify, currency, haptics }));
  } catch {
    state = { ...state, error: "Could not save your data." };
    subs.forEach((f) => f());
  }
}
export async function init() {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  try {
    const raw = await Storage.getItem(KEY);
    if (raw) state = { ...state, ...normalizePersisted(JSON.parse(raw)) };
    setHapticsEnabled(state.haptics);
  } catch { state = { ...state, error: "Could not read saved data." }; }
  state = { ...state, ready: true };
  subs.forEach((f) => f());
}

const when = reminderWhen;
async function cancel(nid?: string) { if (nid) await Notifications.cancelScheduledNotificationAsync(nid).catch(() => {}); }
// Local notification scheduled with iOS itself, so it fires even when the app is closed.
async function schedule(r: Reminder): Promise<string | undefined> {
  if (!state.notify || r.done || when(r) <= new Date()) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.desc || "Reminder" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when(r) },
    });
  } catch { return undefined; }
}
export async function enableNotifications(): Promise<boolean> {
  const p = await Notifications.requestPermissionsAsync();
  const ok = p.granted;
  await set({ notify: ok });
  if (ok) await set({ reminders: await reschedule(state.reminders) });
  return ok;
}

export const saveTask = (t: Task) => set({ tasks: upsert(state.tasks, t) });
export const toggleTask = (t: Task) => saveTask({ ...t, done: !t.done, completedAt: t.done ? null : Date.now() });
export const toggleWish = (w: Wish) => saveWish({ ...w, purchased: !w.purchased, purchasedAt: w.purchased ? null : Date.now() });
export const toggleReminder = (r: Reminder) => saveReminder({ ...r, done: !r.done });

export const delTask = (id: string) => set({ tasks: state.tasks.filter((x) => x.id !== id) });
export const saveWish = (w: Wish) => set({ wishlist: upsert(state.wishlist, w) });
export const delWish = (id: string) => set({ wishlist: state.wishlist.filter((x) => x.id !== id) });
export async function saveReminder(r: Reminder) {
  await cancel(r.nid);
  await set({ reminders: upsert(state.reminders, { ...r, nid: await schedule(r) }) });
}
export async function delReminder(id: string) {
  await cancel(state.reminders.find((x) => x.id === id)?.nid);
  await set({ reminders: state.reminders.filter((x) => x.id !== id) });
}
export const setName = (name: string) => set({ name });
export const setCurrency = (currency: string) => set({ currency: normalizePersisted({ currency }).currency });
export const setHaptics = (haptics: boolean) => { setHapticsEnabled(haptics); return set({ haptics }); };
export const exportJson = () => exportBackup(state);

/** Re-schedules every open reminder's notification (after import / permission change). */
async function reschedule(list: Reminder[]) {
  return Promise.all(list.map(async (r) => { await cancel(r.nid); return { ...r, nid: await schedule(r) }; }));
}
export type ImportResult = { ok: true; counts: { tasks: number; reminders: number; wishlist: number } } | { ok: false; error: string };
/** Reads a backup (this app's or the web app's). `mode: "merge"` keeps existing records with other ids. */
export function previewBackup(text: string) { return parseBackup(text); }
export async function importJson(text: string, mode: "merge" | "replace" = "merge"): Promise<ImportResult> {
  const p = parseBackup(text);
  if (!p.ok) return p;
  const b = p.backup;
  const next = mode === "replace"
    ? { tasks: b.tasks, reminders: b.reminders, wishlist: b.wishlist }
    : { tasks: mergeById(state.tasks, b.tasks), reminders: mergeById(state.reminders, b.reminders), wishlist: mergeById(state.wishlist, b.wishlist) };
  for (const r of state.reminders) await cancel(r.nid);
  await set({ ...next, reminders: next.reminders.map((r) => ({ ...r, nid: undefined })), ...(b.name !== undefined && mode === "replace" ? { name: b.name } : {}), ...(b.currency ? { currency: b.currency } : {}) });
  await set({ reminders: await reschedule(state.reminders) });
  return { ok: true, counts: { tasks: b.tasks.length, reminders: b.reminders.length, wishlist: b.wishlist.length } };
}
export async function clearAll() {
  for (const r of state.reminders) await cancel(r.nid);
  await set({ tasks: [], reminders: [], wishlist: [] });
}
function upsert<T extends { id: string }>(l: T[], x: T) { return l.some((i) => i.id === x.id) ? l.map((i) => (i.id === x.id ? x : i)) : [x, ...l]; }

export const today = () => dateStr(new Date());
export const money = fmt;
export const reminderDate = when;
