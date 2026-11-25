import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { getDb, migrate } from "../db/client";
import * as T from "../db/schema";
import * as Notifications from "expo-notifications";
import { setHapticsEnabled } from "../haptics";

export type Priority = "low" | "normal" | "high" | "urgent";
export type WishPriority = "low" | "normal" | "high";
export type CurrencyCode = "GHS" | "USD" | "EUR" | "GBP" | "NGN" | "KES";
export type AccentKey = "gold" | "emerald" | "azure" | "violet" | "amber";
export type Subtask = { id: string; title: string; done: boolean };
export type Task = {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  due: string;
  dueTime: string;
  category: string;
  subtasks: Subtask[];
  createdAt: number;
  done: boolean;
};
export type Reminder = { id: string; title: string; desc: string; date: string; time: string; done: boolean; nid?: string | null };
export type Wish = {
  id: string;
  name: string;
  desc: string;
  price: number;
  url: string;
  category: string;
  priority: WishPriority;
  notes: string;
  purchased: boolean;
};

export const ACCENTS: Record<AccentKey, { label: string; hex: string }> = {
  gold: { label: "Gold", hex: "#D6B56D" },
  emerald: { label: "Emerald", hex: "#34D399" },
  azure: { label: "Azure", hex: "#60A5FA" },
  violet: { label: "Violet", hex: "#A78BFA" },
  amber: { label: "Amber", hex: "#F59E0B" },
};

type State = {
  tasks: Task[];
  reminders: Reminder[];
  wishlist: Wish[];
  name: string;
  addressAs: string;
  notify: boolean;
  currency: CurrencyCode;
  accent: AccentKey;
  hapticsEnabled: boolean;
  onboarded: boolean;
  tourStep: number | null;
  dueAlert: Reminder | null;
  ready: boolean;
  error: string;
};

let state: State = {
  tasks: [],
  reminders: [],
  wishlist: [],
  name: "",
  addressAs: "",
  notify: false,
  currency: "GHS",
  accent: "gold",
  hapticsEnabled: true,
  onboarded: false,
  tourStep: null,
  dueAlert: null,
  ready: false,
  error: "",
};
const subs = new Set<() => void>();
const alertedIds = new Set<string>();
let alertTimer: ReturnType<typeof setInterval> | null = null;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const useStore = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);

const TABLES = { tasks: T.tasks, reminders: T.reminders, wishlist: T.wishlist } as const;
function notifyAll() { subs.forEach((f) => f()); }
function fail() { state = { ...state, error: "Could not save your data." }; notifyAll(); }
function setState(patch: Partial<State>) { state = { ...state, ...patch }; notifyAll(); }

function parseSubtasks(raw: unknown): Subtask[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setSetting(key: string, value: string) {
  try { getDb().insert(T.settings).values({ key, value }).onConflictDoUpdate({ target: T.settings.key, set: { value } }).run(); } catch { fail(); }
}

function writeRow(kind: keyof typeof TABLES, row: any) {
  const dbRow = kind === "tasks" ? { ...row, subtasks: JSON.stringify(row.subtasks ?? []), updatedAt: Date.now() } : { ...row, updatedAt: Date.now() };
  try { getDb().insert(TABLES[kind] as any).values(dbRow).onConflictDoUpdate({ target: (TABLES[kind] as any).id, set: dbRow }).run(); } catch { fail(); }
  return row;
}

function erase(kind: keyof typeof TABLES, id: string) {
  try { getDb().delete(TABLES[kind] as any).where(eq((TABLES[kind] as any).id, id)).run(); } catch { fail(); }
}

function readAll() {
  const kv = Object.fromEntries(getDb().select().from(T.settings).all().map((x) => [x.key, x.value]));
  const currency = (["GHS", "USD", "EUR", "GBP", "NGN", "KES"].includes(kv.currency) ? kv.currency : "GHS") as CurrencyCode;
  const accent = (["gold", "emerald", "azure", "violet", "amber"].includes(kv.accent) ? kv.accent : "gold") as AccentKey;
  const hapticsEnabled = kv.haptics !== "0";
  setHapticsEnabled(hapticsEnabled);
  const rawTasks = getDb().select().from(T.tasks).all();
  const tasks: Task[] = rawTasks.map((t) => ({ ...t, priority: t.priority as Priority, subtasks: parseSubtasks(t.subtasks) }));
  const wishlist: Wish[] = getDb().select().from(T.wishlist).all().map((w) => ({
    ...w,
    priority: (["low", "normal", "high"].includes(w.priority) ? w.priority : "normal") as WishPriority,
  }));
  return {
    tasks,
    reminders: getDb().select().from(T.reminders).all() as Reminder[],
    wishlist,
    name: kv.name ?? "",
    addressAs: kv.addressAs ?? "",
    notify: kv.notify === "1",
    currency,
    accent,
    hapticsEnabled,
    onboarded: kv.onboarded === "1",
  };
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
  for (const r of state.reminders) { await cancel(r.nid); rs.push(writeRow("reminders", { ...r, nid: ok ? ((await schedule(r)) ?? null) : null })); }
  setState({ reminders: rs });
  return ok;
}

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const ok = await enableNotifications();
      if (!ok) return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: "DAYMARK Test", body: "Notifications are working properly." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: "reminders" },
    });
    return true;
  } catch {
    return false;
  }
}

const upsert = <X extends { id: string }>(l: X[], x: X) => (l.some((i) => i.id === x.id) ? l.map((i) => (i.id === x.id ? x : i)) : [x, ...l]);
export const saveTask = async (t: Task) => setState({ tasks: upsert(state.tasks, writeRow("tasks", t)) });
export const delTask = async (id: string) => { erase("tasks", id); setState({ tasks: state.tasks.filter((x) => x.id !== id) }); };
export const saveWish = async (w: Wish) => setState({ wishlist: upsert(state.wishlist, writeRow("wishlist", w)) });
export const delWish = async (id: string) => { erase("wishlist", id); setState({ wishlist: state.wishlist.filter((x) => x.id !== id) }); };
export async function saveReminder(r: Reminder) {
  await cancel(r.nid);
  setState({ reminders: upsert(state.reminders, writeRow("reminders", { ...r, nid: (await schedule(r)) ?? null })) });
}
export async function snoozeReminder(r: Reminder, mode: "1h" | "tomorrow") {
  let date = r.date;
  let time = r.time;
  if (mode === "1h") {
    const base = Number.isNaN(when(r).getTime()) || when(r) < new Date() ? new Date() : when(r);
    const next = new Date(base.getTime() + 3600e3);
    date = formatDate(next);
    time = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
  } else {
    date = tomorrow();
    time = "09:00";
  }
  await saveReminder({ ...r, date, time, done: false });
}
export async function delReminder(id: string) {
  await cancel(state.reminders.find((x) => x.id === id)?.nid);
  erase("reminders", id); setState({ reminders: state.reminders.filter((x) => x.id !== id) });
}

export const setName = async (name: string) => { await setSetting("name", name); setState({ name }); };
export const setAddressAs = async (addressAs: string) => { await setSetting("addressAs", addressAs); setState({ addressAs }); };
export const setCurrency = async (currency: CurrencyCode) => { await setSetting("currency", currency); setState({ currency }); };
export const setAccent = async (accent: AccentKey) => { await setSetting("accent", accent); setState({ accent }); };
export const setHaptics = async (hapticsEnabled: boolean) => {
  setHapticsEnabled(hapticsEnabled);
  await setSetting("haptics", hapticsEnabled ? "1" : "0");
  setState({ hapticsEnabled });
};
export const completeOnboarding = async (showTour = true) => {
  await setSetting("onboarded", "1");
  setState({ onboarded: true, tourStep: showTour ? 0 : null });
};
export const startTour = () => setState({ tourStep: 0 });
export const setTourStep = (tourStep: number | null) => setState({ tourStep });

export const exportJson = () => JSON.stringify({
  app: "DAYMARK",
  version: 2,
  tasks: state.tasks,
  reminders: state.reminders,
  wishlist: state.wishlist,
  name: state.name,
  addressAs: state.addressAs,
  currency: state.currency,
  accent: state.accent,
}, null, 2);

export async function importJson(text: string): Promise<boolean> {
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== "object" || d.app !== "DAYMARK") return false;
    if ((d.tasks !== undefined && !Array.isArray(d.tasks)) || (d.reminders !== undefined && !Array.isArray(d.reminders)) || (d.wishlist !== undefined && !Array.isArray(d.wishlist))) {
      return false;
    }
    let nextTasks = [...state.tasks];
    for (const raw of d.tasks ?? []) {
      const normalized: Task = {
        id: String(raw.id || uid()),
        title: String(raw.title || "Untitled"),
        notes: String(raw.notes ?? ""),
        priority: (["low", "normal", "high", "urgent"].includes(raw.priority) ? raw.priority : "normal") as Priority,
        due: String(raw.due ?? ""),
        dueTime: String(raw.dueTime ?? ""),
        category: String(raw.category ?? ""),
        subtasks: parseSubtasks(raw.subtasks),
        createdAt: Number(raw.createdAt) || Date.now(),
        done: Boolean(raw.done),
      };
      nextTasks = upsert(nextTasks, writeRow("tasks", normalized));
    }
    let nextWishlist = [...state.wishlist];
    for (const raw of d.wishlist ?? []) {
      const normalized: Wish = {
        id: String(raw.id || uid()),
        name: String(raw.name || "Item"),
        desc: String(raw.desc ?? ""),
        price: Number(raw.price) || 0,
        url: String(raw.url ?? ""),
        category: String(raw.category ?? ""),
        priority: (["low", "normal", "high"].includes(raw.priority) ? raw.priority : "normal") as WishPriority,
        notes: String(raw.notes ?? ""),
        purchased: Boolean(raw.purchased),
      };
      nextWishlist = upsert(nextWishlist, writeRow("wishlist", normalized));
    }
    let nextReminders = [...state.reminders];
    for (const raw of d.reminders ?? []) {
      const existing = nextReminders.find((x) => x.id === raw.id);
      if (existing?.nid) await cancel(existing.nid);
      const base: Reminder = {
        id: String(raw.id || uid()),
        title: String(raw.title || "Reminder"),
        desc: String(raw.desc ?? ""),
        date: String(raw.date || today()),
        time: String(raw.time || "09:00"),
        done: Boolean(raw.done),
      };
      nextReminders = upsert(nextReminders, writeRow("reminders", { ...base, nid: (await schedule(base)) ?? null }));
    }
    setState({ tasks: nextTasks, wishlist: nextWishlist, reminders: nextReminders });
    if (typeof d.name === "string" && d.name.trim()) await setName(d.name);
    if (typeof d.addressAs === "string" && d.addressAs.trim()) await setAddressAs(d.addressAs);
    if (["GHS", "USD", "EUR", "GBP", "NGN", "KES"].includes(d.currency)) await setCurrency(d.currency);
    if (["gold", "emerald", "azure", "violet", "amber"].includes(d.accent)) await setAccent(d.accent);
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
const CURRENCY_SYM: Record<CurrencyCode, string> = { GHS: "GH₵ ", USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh " };
export const formatDate = (d: Date) => new Date(+d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const addDays = (days: number) => formatDate(new Date(Date.now() + days * 864e5));
export const today = () => formatDate(new Date());
export const tomorrow = () => addDays(1);
export const money = (n: number, c: CurrencyCode = state.currency) => CURRENCY_SYM[c] + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const reminderDate = when;
export const PRI: Record<Priority, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
