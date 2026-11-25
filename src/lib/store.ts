import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { getDb, migrate } from "../db/client";
import * as T from "../db/schema";
import * as Notifications from "expo-notifications";

export type Priority = "low" | "normal" | "high" | "urgent";
export type CurrencyCode = "GHS" | "USD" | "EUR" | "GBP";
export type Task = { id: string; title: string; notes: string; priority: Priority; due: string; dueTime: string; category: string; createdAt: number; done: boolean };
export type Reminder = { id: string; title: string; desc: string; date: string; time: string; done: boolean; nid?: string | null };
export type Wish = { id: string; name: string; desc: string; price: number; url: string; category: string; notes: string; purchased: boolean };
type State = { tasks: Task[]; reminders: Reminder[]; wishlist: Wish[]; name: string; notify: boolean; currency: CurrencyCode; dueAlert: Reminder | null; ready: boolean; error: string };

let state: State = { tasks: [], reminders: [], wishlist: [], name: "", notify: false, currency: "GHS", dueAlert: null, ready: false, error: "" };
const subs = new Set<() => void>();
const alertedIds = new Set<string>();
let alertTimer: ReturnType<typeof setInterval> | null = null;
const KEY = "daymark.v1";
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const useStore = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);

const TABLES = { tasks: T.tasks, reminders: T.reminders, wishlist: T.wishlist } as const;
function notifyAll() { subs.forEach((f) => f()); }
function fail() { state = { ...state, error: "Could not save your data." }; notifyAll(); }
function setState(patch: Partial<State>) { state = { ...state, ...patch }; notifyAll(); }
async function setSetting(key: string, value: string) { try { getDb().insert(T.settings).values({ key, value }).onConflictDoUpdate({ target: T.settings.key, set: { value } }).run(); } catch { fail(); } }
function write(kind: keyof typeof TABLES, row: any) {
  const r = { ...row, updatedAt: Date.now() };
  try { getDb().insert(TABLES[kind] as any).values(r).onConflictDoUpdate({ target: (TABLES[kind] as any).id, set: r }).run(); } catch { fail(); }
  return r;
}
function erase(kind: keyof typeof TABLES, id: string) { try { getDb().delete(TABLES[kind] as any).where(eq((TABLES[kind] as any).id, id)).run(); } catch { fail(); } }
function readAll() {
  const kv = Object.fromEntries(getDb().select().from(T.settings).all().map((x) => [x.key, x.value]));
  const currency = (["GHS", "USD", "EUR", "GBP"].includes(kv.currency) ? kv.currency : "GHS") as CurrencyCode;
  return { tasks: getDb().select().from(T.tasks).all() as Task[], reminders: getDb().select().from(T.reminders).all() as Reminder[], wishlist: getDb().select().from(T.wishlist).all() as Wish[], name: kv.name ?? "", notify: kv.notify === "1", currency };
}
function checkDueReminders() {
  if (state.dueAlert) return;
  const now = new Date();
  const due = state.reminders.find((r) => !r.done && !alertedIds.has(r.id) && when(r) <= now);
  if (due) {
    alertedIds.add(due.id);
    setState({ dueAlert: due });
  }
}
export const dismissDueAlert = () => setState({ dueAlert: null });
export async function init() {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reminders", { name: "Reminders", importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
  if (Platform.OS !== "web") {
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  }
  try { await migrate(); state = { ...state, ...readAll() }; } catch { state = { ...state, error: "Could not read saved data." }; }
  setState({ ready: true });
  checkDueReminders();
  if (alertTimer) clearInterval(alertTimer);
  alertTimer = setInterval(checkDueReminders, 15000);
}

const when = (r: Reminder) => new Date(`${r.date}T${r.time}:00`);
async function cancel(nid?: string | null) {
  if (nid && Platform.OS !== "web") await Notifications.cancelScheduledNotificationAsync(nid).catch(() => {});
}
// Local notification scheduled with iOS itself, so it fires even when the app is closed.
async function schedule(r: Reminder): Promise<string | undefined> {
  if (Platform.OS === "web") return undefined;
  const dt = when(r);
  if (!state.notify || r.done || Number.isNaN(dt.getTime()) || dt <= new Date()) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.desc || "Reminder" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dt, channelId: "reminders" },
    });
  } catch { return undefined; }
}
export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const ok = (await Notifications.requestPermissionsAsync()).granted;
  state = { ...state, notify: ok }; await setSetting("notify", ok ? "1" : "0");
  const rs: Reminder[] = [];
  for (const r of state.reminders) { await cancel(r.nid); rs.push(write("reminders", { ...r, nid: ok ? ((await schedule(r)) ?? null) : null })); }
  setState({ reminders: rs });
  return ok;
}
const upsert = <X extends { id: string }>(l: X[], x: X) => (l.some((i) => i.id === x.id) ? l.map((i) => (i.id === x.id ? x : i)) : [x, ...l]);
export const saveTask = async (t: Task) => setState({ tasks: upsert(state.tasks, write("tasks", t)) });
export const delTask = async (id: string) => { erase("tasks", id); setState({ tasks: state.tasks.filter((x) => x.id !== id) }); };
export const saveWish = async (w: Wish) => setState({ wishlist: upsert(state.wishlist, write("wishlist", w)) });
export const delWish = async (id: string) => { erase("wishlist", id); setState({ wishlist: state.wishlist.filter((x) => x.id !== id) }); };
export async function saveReminder(r: Reminder) {
  await cancel(r.nid);
  setState({ reminders: upsert(state.reminders, write("reminders", { ...r, nid: (await schedule(r)) ?? null })) });
}
export async function delReminder(id: string) {
  await cancel(state.reminders.find((x) => x.id === id)?.nid);
  erase("reminders", id); setState({ reminders: state.reminders.filter((x) => x.id !== id) });
}
export const setName = async (name: string) => { await setSetting("name", name); setState({ name }); };
export const setCurrency = async (currency: CurrencyCode) => { await setSetting("currency", currency); setState({ currency }); };
export const exportJson = () => JSON.stringify({ app: "DAYMARK", version: 1, tasks: state.tasks, reminders: state.reminders, wishlist: state.wishlist, name: state.name, currency: state.currency }, null, 2);
export async function importJson(text: string): Promise<boolean> {
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== "object" || d.app !== "DAYMARK") return false;
    if ((d.tasks !== undefined && !Array.isArray(d.tasks)) || (d.reminders !== undefined && !Array.isArray(d.reminders)) || (d.wishlist !== undefined && !Array.isArray(d.wishlist))) {
      return false;
    }
    await clearAll();
    const tk = (d.tasks ?? []).map((x: Partial<Task>) => write("tasks", { dueTime: "", category: "", createdAt: 0, notes: "", due: "", priority: "normal", done: false, ...x }));
    const wl = (d.wishlist ?? []).map((x: Partial<Wish>) => write("wishlist", { desc: "", price: 0, url: "", category: "", notes: "", purchased: false, ...x }));
    const rs: Reminder[] = [];
    for (const r of d.reminders ?? []) rs.push(write("reminders", { ...r, nid: (await schedule(r)) ?? null }));
    setState({ tasks: tk, wishlist: wl, reminders: rs });
    if (typeof d.name === "string") await setName(d.name);
    if (["GHS", "USD", "EUR", "GBP"].includes(d.currency)) await setCurrency(d.currency);
    return true;
  } catch { return false; }
}
export async function clearAll() {
  for (const r of state.reminders) await cancel(r.nid);
  try { for (const k of Object.keys(TABLES) as (keyof typeof TABLES)[]) getDb().delete(TABLES[k] as any).run(); } catch { fail(); }
  setState({ tasks: [], reminders: [], wishlist: [] });
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
export const isValidTime = (s: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const CURRENCY_SYM: Record<CurrencyCode, string> = { GHS: "GH₵ ", USD: "$", EUR: "€", GBP: "£" };
export const today = () => { const d = new Date(); return new Date(+d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const tomorrow = () => { const d = new Date(Date.now() + 864e5); return new Date(+d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const money = (n: number, c: CurrencyCode = state.currency) => CURRENCY_SYM[c] + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const reminderDate = when;
export const PRI: Record<Priority, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
