import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { clearAllEntities, clearNotificationEntities, deleteEntity, type EntityKind, initStorage, type RawSnapshot, saveEntity, saveSetting } from "../db/persistence";
import * as Notifications from "expo-notifications";
import { setHapticsEnabled } from "../haptics";
import { requestWebNotificationPermission, showWebNotification } from "./pwa";

export type Priority = "low" | "normal" | "high" | "urgent";
export type WishPriority = "low" | "normal" | "high";
export type CurrencyCode = "GHS" | "USD" | "EUR" | "GBP" | "NGN" | "KES";
export type AccentKey = "gold" | "emerald" | "azure" | "violet" | "amber";
export type ThemePref = "dark" | "light" | "system";
export type SwipeAction = "delete" | "read" | "none";
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
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  time: string;
  kind: "reminder" | "task" | "system";
  refId?: string | null;
  read: boolean;
  createdAt: number;
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
  notifications: AppNotification[];
  name: string;
  addressAs: string;
  notify: boolean;
  currency: CurrencyCode;
  accent: AccentKey;
  theme: ThemePref;
  rightSwipe: SwipeAction;
  leftSwipe: SwipeAction;
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
  notifications: [],
  name: "",
  addressAs: "",
  notify: false,
  currency: "GHS",
  accent: "gold",
  theme: "dark",
  rightSwipe: "read",
  leftSwipe: "delete",
  hapticsEnabled: true,
  onboarded: false,
  tourStep: null,
  dueAlert: null,
  ready: false,
  error: "",
};
const subs = new Set<() => void>();
const alertedIds = new Set<string>();
let clearedNotifs = new Set<string>();
let alertTimer: ReturnType<typeof setInterval> | null = null;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const useStore = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);

function notifyAll() { subs.forEach((f) => f()); }
function fail() { state = { ...state, error: "Could not save your data." }; notifyAll(); }
function setState(patch: Partial<State>) { state = { ...state, ...patch }; notifyAll(); }

function parseJsonArray<X>(raw: unknown): X[] {
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
  try { saveSetting(key, value); } catch { fail(); }
}

function writeRow(kind: EntityKind, row: any) {
  try { saveEntity(kind, row); } catch { fail(); }
  return row;
}

function erase(kind: EntityKind, id: string) {
  try { deleteEntity(kind, id); } catch { fail(); }
}

function hydrateSnapshot(snap: RawSnapshot) {
  const kv = snap.settings ?? {};
  const currency = (["GHS", "USD", "EUR", "GBP", "NGN", "KES"].includes(kv.currency) ? kv.currency : "GHS") as CurrencyCode;
  const accent = (["gold", "emerald", "azure", "violet", "amber"].includes(kv.accent) ? kv.accent : "gold") as AccentKey;
  const theme = (["dark", "light", "system"].includes(kv.theme) ? kv.theme : "dark") as ThemePref;
  const rightSwipe = (["delete", "read", "none"].includes(kv.right_swipe) ? kv.right_swipe : "read") as SwipeAction;
  const leftSwipe = (["delete", "read", "none"].includes(kv.left_swipe) ? kv.left_swipe : "delete") as SwipeAction;
  const hapticsEnabled = kv.haptics !== "0";
  setHapticsEnabled(hapticsEnabled);
  clearedNotifs = new Set(parseJsonArray<string>(kv.cleared_notifs));
  const tasks: Task[] = snap.tasks.map((t) => ({ ...t, priority: t.priority as Priority, subtasks: parseJsonArray<Subtask>(t.subtasks) }));
  const wishlist: Wish[] = snap.wishlist.map((w) => ({
    ...w,
    priority: (["low", "normal", "high"].includes(w.priority) ? w.priority : "normal") as WishPriority,
  }));
  const notifications: AppNotification[] = snap.notifications
    .map((n) => ({ ...n, kind: (["reminder", "task", "system"].includes(n.kind) ? n.kind : "system") as AppNotification["kind"] }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return {
    tasks,
    reminders: snap.reminders as Reminder[],
    wishlist,
    notifications,
    name: kv.name ?? "",
    addressAs: kv.addressAs ?? "",
    notify: kv.notify === "1",
    currency,
    accent,
    theme,
    rightSwipe,
    leftSwipe,
    hapticsEnabled,
    onboarded: kv.onboarded === "1",
  };
}

function syncNotifications() {
  const now = new Date();
  const td = today();
  const existingIds = new Set(state.notifications.map((n) => n.id));
  const added: AppNotification[] = [];

  for (const r of state.reminders) {
    if (r.done || when(r) > now) continue;
    const id = `rem_${r.id}_${r.date}_${r.time}`;
    if (existingIds.has(id) || clearedNotifs.has(id)) continue;
    added.push(writeRow("notifications", {
      id,
      title: r.title,
      body: r.desc || `Reminder due ${r.date} at ${r.time}`,
      date: r.date,
      time: r.time,
      kind: "reminder",
      refId: r.id,
      read: false,
      createdAt: Date.now(),
    }));
    existingIds.add(id);
  }

  for (const t of state.tasks) {
    if (t.done || !t.due || t.due >= td) continue;
    const id = `task_${t.id}_${t.due}`;
    if (existingIds.has(id) || clearedNotifs.has(id)) continue;
    added.push(writeRow("notifications", {
      id,
      title: `Overdue task: ${t.title}`,
      body: t.notes || `Was due ${t.due}${t.dueTime ? ` at ${t.dueTime}` : ""}`,
      date: t.due,
      time: t.dueTime || "",
      kind: "task",
      refId: t.id,
      read: false,
      createdAt: Date.now(),
    }));
    existingIds.add(id);
  }

  if (added.length) {
    setState({ notifications: [...added, ...state.notifications].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) });
  }
}

function checkDueReminders() {
  syncNotifications();
  if (state.dueAlert) return;
  const now = new Date();
  const due = state.reminders.find((r) => !r.done && !alertedIds.has(r.id) && when(r) <= now);
  if (due) {
    alertedIds.add(due.id);
    setState({ dueAlert: due });
    if (Platform.OS === "web" && state.notify) {
      void showWebNotification(due.title, due.desc || `Due ${due.date} at ${due.time}`, `rem_${due.id}`);
    }
  }
}

export const dismissDueAlert = () => setState({ dueAlert: null });

export async function init() {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reminders", { name: "Reminders", importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
  if (Platform.OS !== "web") {
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  }
  try {
    const snap = await initStorage();
    state = { ...state, ...hydrateSnapshot(snap) };
  } catch { state = { ...state, error: "Could not read saved data." }; }
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
  if (Platform.OS === "web") {
    const ok = await requestWebNotificationPermission();
    state = { ...state, notify: ok };
    await setSetting("notify", ok ? "1" : "0");
    notifyAll();
    return ok;
  }
  const ok = (await Notifications.requestPermissionsAsync()).granted;
  state = { ...state, notify: ok }; await setSetting("notify", ok ? "1" : "0");
  const rs: Reminder[] = [];
  for (const r of state.reminders) { await cancel(r.nid); rs.push(writeRow("reminders", { ...r, nid: ok ? ((await schedule(r)) ?? null) : null })); }
  setState({ reminders: rs });
  return ok;
}

export async function disableNotifications(): Promise<void> {
  const rs: Reminder[] = [];
  for (const r of state.reminders) {
    await cancel(r.nid);
    rs.push(writeRow("reminders", { ...r, nid: null }));
  }
  await setSetting("notify", "0");
  setState({ notify: false, reminders: rs });
}

export async function sendTestNotification(): Promise<boolean> {
  const now = new Date();
  const item: AppNotification = writeRow("notifications", {
    id: `sys_${uid()}`,
    title: "DAYMARKED Test Notification",
    body: "In-app notifications are active. Swipe left or right to manage.",
    date: today(),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    kind: "system",
    refId: null,
    read: false,
    createdAt: Date.now(),
  });
  setState({ notifications: [item, ...state.notifications] });

  if (Platform.OS === "web") {
    const ok = await requestWebNotificationPermission();
    if (ok) {
      state = { ...state, notify: true };
      await setSetting("notify", "1");
      notifyAll();
      await showWebNotification("DAYMARKED Test", "Notifications are working on this device.", "daymarked-test");
    }
    return true;
  }
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const ok = await enableNotifications();
      if (!ok) return true;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: "DAYMARKED Test", body: "Notifications are working properly." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: "reminders" },
    });
    return true;
  } catch {
    return true;
  }
}

const upsert = <X extends { id: string }>(l: X[], x: X) => (l.some((i) => i.id === x.id) ? l.map((i) => (i.id === x.id ? x : i)) : [x, ...l]);
export const saveTask = async (t: Task) => { setState({ tasks: upsert(state.tasks, writeRow("tasks", t)) }); syncNotifications(); };
export const delTask = async (id: string) => { erase("tasks", id); setState({ tasks: state.tasks.filter((x) => x.id !== id) }); };
export const saveWish = async (w: Wish) => setState({ wishlist: upsert(state.wishlist, writeRow("wishlist", w)) });
export const delWish = async (id: string) => { erase("wishlist", id); setState({ wishlist: state.wishlist.filter((x) => x.id !== id) }); };
export async function saveReminder(r: Reminder) {
  await cancel(r.nid);
  setState({ reminders: upsert(state.reminders, writeRow("reminders", { ...r, nid: (await schedule(r)) ?? null })) });
  syncNotifications();
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

export async function toggleReadNotification(id: string) {
  const target = state.notifications.find((n) => n.id === id);
  if (!target) return;
  const updated = writeRow("notifications", { ...target, read: !target.read });
  setState({ notifications: upsert(state.notifications, updated) });
}
export async function setNotificationRead(id: string, read: boolean) {
  const target = state.notifications.find((n) => n.id === id);
  if (!target || target.read === read) return;
  const updated = writeRow("notifications", { ...target, read });
  setState({ notifications: upsert(state.notifications, updated) });
}
export async function markAllNotificationsRead() {
  const next = state.notifications.map((n) => (n.read ? n : writeRow("notifications", { ...n, read: true })));
  setState({ notifications: next });
}
export async function deleteNotification(id: string) {
  erase("notifications", id);
  clearedNotifs.add(id);
  await setSetting("cleared_notifs", JSON.stringify(Array.from(clearedNotifs).slice(-200)));
  setState({ notifications: state.notifications.filter((n) => n.id !== id) });
}
export async function clearNotifications() {
  for (const n of state.notifications) clearedNotifs.add(n.id);
  await setSetting("cleared_notifs", JSON.stringify(Array.from(clearedNotifs).slice(-200)));
  try { clearNotificationEntities(); } catch { fail(); }
  setState({ notifications: [] });
}

export const setName = async (name: string) => { await setSetting("name", name); setState({ name }); };
export const setAddressAs = async (addressAs: string) => { await setSetting("addressAs", addressAs); setState({ addressAs }); };
export const setCurrency = async (currency: CurrencyCode) => { await setSetting("currency", currency); setState({ currency }); };
export const setAccent = async (accent: AccentKey) => { await setSetting("accent", accent); setState({ accent }); };
export const setTheme = async (theme: ThemePref) => { await setSetting("theme", theme); setState({ theme }); };
export const setRightSwipe = async (rightSwipe: SwipeAction) => { await setSetting("right_swipe", rightSwipe); setState({ rightSwipe }); };
export const setLeftSwipe = async (leftSwipe: SwipeAction) => { await setSetting("left_swipe", leftSwipe); setState({ leftSwipe }); };
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
  app: "DAYMARKED",
  version: 2,
  tasks: state.tasks,
  reminders: state.reminders,
  wishlist: state.wishlist,
  name: state.name,
  addressAs: state.addressAs,
  currency: state.currency,
  accent: state.accent,
  theme: state.theme,
  rightSwipe: state.rightSwipe,
  leftSwipe: state.leftSwipe,
}, null, 2);

export async function importJson(text: string): Promise<boolean> {
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== "object" || (d.app !== "DAYMARKED" && d.app !== "DAYMARK")) return false;
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
        subtasks: parseJsonArray<Subtask>(raw.subtasks),
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
    if (["dark", "light", "system"].includes(d.theme)) await setTheme(d.theme);
    if (["delete", "read", "none"].includes(d.rightSwipe)) await setRightSwipe(d.rightSwipe);
    if (["delete", "read", "none"].includes(d.leftSwipe)) await setLeftSwipe(d.leftSwipe);
    syncNotifications();
    return true;
  } catch { return false; }
}

export async function clearAll() {
  for (const r of state.reminders) await cancel(r.nid);
  clearedNotifs.clear();
  await setSetting("cleared_notifs", "[]");
  try { clearAllEntities(); } catch { fail(); }
  setState({ tasks: [], reminders: [], wishlist: [], notifications: [] });
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
