// Pure logic (no React / native imports) so it can be unit-tested with `node --test`.
// Uses only erasable TypeScript syntax.

export type Priority = "low" | "normal" | "high" | "urgent";
export type WishPriority = "low" | "medium" | "high";
export type Task = {
  id: string; title: string; notes: string; priority: Priority; due: string; dueTime: string;
  category: string; done: boolean; completedAt: number | null; createdAt: number;
};
export type Reminder = {
  id: string; title: string; desc: string; date: string; time: string; done: boolean;
  nid?: string; createdAt: number;
};
export type Wish = {
  id: string; name: string; desc: string; notes: string; price: number; url: string;
  category: string; priority: WishPriority; purchased: boolean; purchasedAt: number | null; createdAt: number;
};

export const PRI: Record<Priority, number> = { low: 1, normal: 2, high: 3, urgent: 4 };
export const WPRI: Record<WishPriority, number> = { low: 1, medium: 2, high: 3 };
export const CURRENCIES = ["GH₵", "$", "€", "£", "₦", "KSh"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
export const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00"));
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function addDays(s: string, n: number) {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
export const money = (n: number, cur = "GH₵") =>
  `${cur} ${(Number(n) || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- Tasks ----------
export type TaskFilter = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TaskSort = "due" | "priority" | "created" | "alpha";

const taskKey = (t: Task) => (t.due ? t.due + (t.dueTime || "23:59") : "9999");
export function isTaskOverdue(t: Task, now = new Date()) {
  if (t.done || !t.due) return false;
  const today = dateStr(now);
  if (t.due < today) return true;
  return t.due === today && !!t.dueTime && t.dueTime < timeStr(now);
}
export function filterTasks(tasks: Task[], f: TaskFilter, sort: TaskSort, q: string, now = new Date()) {
  const today = dateStr(now);
  const query = q.trim().toLowerCase();
  const match: Record<TaskFilter, (t: Task) => boolean> = {
    all: () => true,
    today: (t) => !t.done && t.due === today,
    upcoming: (t) => !t.done && !!t.due && t.due > today,
    overdue: (t) => isTaskOverdue(t, now),
    completed: (t) => t.done,
  };
  const cmp: Record<TaskSort, (a: Task, b: Task) => number> = {
    due: (a, b) => taskKey(a).localeCompare(taskKey(b)),
    priority: (a, b) => PRI[b.priority] - PRI[a.priority] || taskKey(a).localeCompare(taskKey(b)),
    created: (a, b) => b.createdAt - a.createdAt,
    alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  };
  return tasks
    .filter((t) => match[f](t) && (!query || `${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(query)))
    .sort(cmp[sort]);
}

// ---------- Reminders ----------
export type ReminderFilter = "all" | "today" | "tomorrow" | "upcoming" | "overdue" | "completed";
export const reminderWhen = (r: Pick<Reminder, "date" | "time">) => new Date(`${r.date}T${r.time}:00`);
export function reminderBucket(r: Reminder, now = new Date()): Exclude<ReminderFilter, "all"> {
  if (r.done) return "completed";
  if (reminderWhen(r) < now) return "overdue";
  const today = dateStr(now);
  if (r.date === today) return "today";
  if (r.date === addDays(today, 1)) return "tomorrow";
  return "upcoming";
}
export function filterReminders(list: Reminder[], f: ReminderFilter, q: string, now = new Date()) {
  const query = q.trim().toLowerCase();
  return list
    .filter((r) => (f === "all" || reminderBucket(r, now) === f) && (!query || `${r.title} ${r.desc}`.toLowerCase().includes(query)))
    .sort((a, b) => +reminderWhen(a) - +reminderWhen(b));
}
export function snoozeByMinutes(r: Reminder, minutes: number, now = new Date()): Reminder {
  const d = new Date(+now + minutes * 60000);
  return { ...r, done: false, date: dateStr(d), time: timeStr(d) };
}
export function snoozeToTomorrow(r: Reminder, now = new Date()): Reminder {
  return { ...r, done: false, date: addDays(dateStr(now), 1), time: "09:00" };
}

// ---------- Wishlist ----------
export type WishFilter = "all" | "unpurchased" | "purchased";
export type WishSort = "newest" | "price-asc" | "price-desc" | "priority" | "alpha";
export function wishStats(list: Wish[]) {
  const open = list.filter((w) => !w.purchased);
  const bought = list.filter((w) => w.purchased);
  const sum = (l: Wish[]) => l.reduce((a, w) => a + (Number(w.price) || 0), 0);
  return { total: list.length, remaining: open.length, remainingCost: sum(open), acquiredCost: sum(bought) };
}
export const wishCategories = (list: Wish[]) =>
  [...new Set(list.map((w) => w.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
export function filterWishes(list: Wish[], f: WishFilter, sort: WishSort, q: string, category = "all") {
  const query = q.trim().toLowerCase();
  const cmp: Record<WishSort, (a: Wish, b: Wish) => number> = {
    newest: (a, b) => b.createdAt - a.createdAt,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    priority: (a, b) => WPRI[b.priority] - WPRI[a.priority] || b.price - a.price,
    alpha: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  };
  return list
    .filter((w) =>
      (f === "all" || (f === "purchased" ? w.purchased : !w.purchased)) &&
      (category === "all" || w.category.trim().toLowerCase() === category.toLowerCase()) &&
      (!query || `${w.name} ${w.desc} ${w.notes} ${w.category}`.toLowerCase().includes(query)))
    .sort(cmp[sort]);
}
/** Unpurchased items that satisfy the picker's budget (0 = any) and category ("all" = any) filters. */
export function pickerPool(list: Wish[], budget: number, category: string) {
  return list.filter((w) =>
    !w.purchased &&
    (!(budget > 0) || w.price <= budget) &&
    (category === "all" || w.category.trim().toLowerCase() === category.toLowerCase()));
}
/** Random choice that avoids repeating `lastId` when there is an alternative. */
export function pickRandom<T extends { id: string }>(pool: T[], lastId: string | null, rng: () => number = Math.random): T | null {
  if (!pool.length) return null;
  const c = pool.length > 1 && lastId ? pool.filter((x) => x.id !== lastId) : pool;
  return c[Math.min(c.length - 1, Math.floor(rng() * c.length))];
}

// ---------- Dashboard ----------
export function dashboardStats(tasks: Task[], reminders: Reminder[], now = new Date()) {
  const today = dateStr(now);
  const open = tasks.filter((t) => !t.done);
  return {
    open: open.length,
    completed: tasks.length - open.length,
    dueToday: open.filter((t) => t.due === today).sort((a, b) => taskKey(a).localeCompare(taskKey(b))),
    overdue: tasks.filter((t) => isTaskOverdue(t, now)).length,
    blockers: open.filter((t) => PRI[t.priority] >= PRI.high).sort((a, b) => PRI[b.priority] - PRI[a.priority] || taskKey(a).localeCompare(taskKey(b))),
    upcoming: reminders.filter((r) => !r.done).sort((a, b) => +reminderWhen(a) - +reminderWhen(b)).slice(0, 3),
  };
}

// ---------- Persistence / migration ----------
export type Persisted = { tasks: Task[]; reminders: Reminder[]; wishlist: Wish[]; name: string; notify: boolean; currency: string; haptics: boolean };
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => { const n = typeof v === "number" ? v : parseFloat(String(v)); return isFinite(n) ? n : d; };
const oneOf = <T extends string>(v: unknown, l: readonly T[], d: T): T => (l.includes(v as T) ? (v as T) : d);

export function normTask(x: any, i = 0): Task {
  return {
    id: str(x.id), title: str(x.title), notes: str(x.notes ?? x.description),
    priority: oneOf(x.priority, ["low", "normal", "high", "urgent"], "normal"),
    due: isDate(x.due ?? x.dueDate) ? (x.due ?? x.dueDate) : "", dueTime: isTime(x.dueTime) ? x.dueTime : "",
    category: str(x.category), done: !!(x.done ?? x.completed),
    completedAt: typeof x.completedAt === "number" ? x.completedAt : null, createdAt: num(x.createdAt, i),
  };
}
export function normReminder(x: any, i = 0): Reminder {
  return {
    id: str(x.id), title: str(x.title), desc: str(x.desc ?? x.description),
    date: str(x.date ?? x.reminderDate), time: isTime(x.time ?? x.reminderTime) ? (x.time ?? x.reminderTime) : "09:00",
    done: !!(x.done ?? x.completed), nid: undefined, createdAt: num(x.createdAt, i),
  };
}
export function normWish(x: any, i = 0): Wish {
  const p = x.priority === "normal" ? "medium" : x.priority;
  return {
    id: str(x.id), name: str(x.name), desc: str(x.desc ?? x.description), notes: str(x.notes),
    price: Math.max(0, num(x.price ?? x.estimatedPrice)), url: str(x.url ?? x.productUrl), category: str(x.category),
    priority: oneOf(p, ["low", "medium", "high"], "medium"), purchased: !!(x.purchased ?? x.done),
    purchasedAt: typeof x.purchasedAt === "number" ? x.purchasedAt : null, createdAt: num(x.createdAt, i),
  };
}
/** Accepts anything stored by v1 of this app (or nothing) and returns a complete, current-shape state. */
export function normalizePersisted(raw: any): Persisted {
  const r = raw && typeof raw === "object" ? raw : {};
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    tasks: arr(r.tasks).map(normTask), reminders: arr(r.reminders).map(normReminder), wishlist: arr(r.wishlist).map(normWish),
    name: str(r.name), notify: !!r.notify, currency: oneOf(r.currency, CURRENCIES, "GH₵"), haptics: r.haptics !== false,
  };
}

// ---------- Backup ----------
export type Backup = { tasks: Task[]; reminders: Reminder[]; wishlist: Wish[]; name?: string; currency?: string };
export function exportBackup(s: Pick<Persisted, "tasks" | "reminders" | "wishlist" | "name" | "currency">, now = new Date()) {
  return JSON.stringify({
    app: "DAYMARK", schemaVersion: 2, exportedAt: now.toISOString(), name: s.name, currency: s.currency,
    tasks: s.tasks, reminders: s.reminders.map(({ nid, ...r }) => r), wishlist: s.wishlist,
  }, null, 2);
}
/**
 * Parses a backup from this app (flat) or from the DAYMARK web app (`{ data: { tasks, ... } }`).
 * Returns an error string instead of throwing so the UI can show it.
 */
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let d: any;
  try { d = JSON.parse(text); } catch { return { ok: false, error: "That isn’t valid JSON." }; }
  if (!d || typeof d !== "object" || d.app !== "DAYMARK") return { ok: false, error: "That isn’t a DAYMARK backup." };
  const src = d.data && typeof d.data === "object" ? d.data : d;
  for (const k of ["tasks", "reminders", "wishlist"]) {
    if (src[k] !== undefined && !Array.isArray(src[k])) return { ok: false, error: `Backup “${k}” must be a list.` };
  }
  const check = (list: any[], label: string, field: string) => {
    for (let i = 0; i < list.length; i++) {
      if (!list[i] || typeof list[i].id !== "string" || !list[i].id) return `${label} #${i + 1} has no id.`;
      if (typeof list[i][field] !== "string" || !list[i][field].trim()) return `${label} #${i + 1} has no ${field}.`;
    }
    return "";
  };
  const tasks = src.tasks ?? [], reminders = src.reminders ?? [], wishlist = src.wishlist ?? [];
  const err = check(tasks, "Task", "title") || check(reminders, "Reminder", "title") || check(wishlist, "Wishlist item", "name");
  if (err) return { ok: false, error: err };
  for (let i = 0; i < reminders.length; i++) {
    const n = normReminder(reminders[i]);
    if (!isDate(n.date)) return { ok: false, error: `Reminder #${i + 1} has no valid date.` };
  }
  const settings: any[] = Array.isArray(src.settings) ? src.settings : [];
  const cur = d.currency ?? settings.find((s) => s?.key === "currency")?.value;
  return {
    ok: true,
    backup: {
      tasks: tasks.map(normTask), reminders: reminders.map(normReminder), wishlist: wishlist.map(normWish),
      name: typeof d.name === "string" ? d.name : undefined, currency: CURRENCIES.includes(cur) ? cur : undefined,
    },
  };
}
/** Merge by id: incoming records replace existing ones with the same id; everything else is kept. */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(incoming.map((x) => x.id));
  return [...incoming, ...existing.filter((x) => !ids.has(x.id))];
}
