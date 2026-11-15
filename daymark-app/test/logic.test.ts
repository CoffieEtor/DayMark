import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/lib/logic.ts";

const NOW = new Date("2026-11-15T10:00:00");
const task = (o: Partial<L.Task>): L.Task => L.normTask({ id: "t" + Math.random(), title: "x", ...o });
const rem = (o: Partial<L.Reminder>): L.Reminder => L.normReminder({ id: "r" + Math.random(), title: "x", date: "2026-11-15", time: "12:00", ...o });
const wish = (o: Partial<L.Wish>): L.Wish => L.normWish({ id: "w" + Math.random(), name: "x", ...o });

test("tasks: filters, overdue by time, sorts", () => {
  const ts = [
    task({ title: "late", due: "2026-11-14" }), task({ title: "earlier today", due: "2026-11-15", dueTime: "09:00" }),
    task({ title: "later today", due: "2026-11-15", dueTime: "18:00" }), task({ title: "next week", due: "2026-11-22" }),
    task({ title: "done", due: "2026-11-01", done: true }), task({ title: "nodate" }),
  ];
  const names = (f: L.TaskFilter, s: L.TaskSort = "due") => L.filterTasks(ts, f, s, "", NOW).map((t) => t.title);
  assert.deepEqual(names("overdue"), ["late", "earlier today"]);
  assert.deepEqual(names("today"), ["earlier today", "later today"]);
  assert.deepEqual(names("upcoming"), ["later today".length ? "next week" : ""]);
  assert.deepEqual(names("completed"), ["done"]);
  assert.equal(names("all", "alpha")[0], "done");
  assert.equal(L.filterTasks(ts, "all", "due", "NEXT", NOW).length, 1);
});

test("reminders: buckets and snooze", () => {
  assert.equal(L.reminderBucket(rem({ time: "09:00" }), NOW), "overdue");
  assert.equal(L.reminderBucket(rem({}), NOW), "today");
  assert.equal(L.reminderBucket(rem({ date: "2026-11-16" }), NOW), "tomorrow");
  assert.equal(L.reminderBucket(rem({ date: "2026-12-01" }), NOW), "upcoming");
  assert.equal(L.reminderBucket(rem({ done: true }), NOW), "completed");
  const s = L.snoozeByMinutes(rem({ time: "09:00" }), 60, NOW);
  assert.deepEqual([s.date, s.time], ["2026-11-15", "11:00"]);
  const t = L.snoozeToTomorrow(rem({}), NOW);
  assert.deepEqual([t.date, t.time], ["2026-11-16", "09:00"]);
  assert.equal(L.addDays("2026-12-31", 1), "2027-01-01");
});

test("wishlist: stats, filters, picker pool, no immediate repeat", () => {
  const ws = [wish({ name: "a", price: 100, category: "Tech" }), wish({ name: "b", price: 900, category: "Home" }),
    wish({ name: "c", price: 50, purchased: true }), wish({ name: "d", price: 300, category: "tech", priority: "high" })];
  const st = L.wishStats(ws);
  assert.deepEqual(st, { total: 4, remaining: 3, remainingCost: 1300, acquiredCost: 50 });
  assert.deepEqual(L.pickerPool(ws, 500, "all").map((w) => w.name), ["a", "d"]);
  assert.deepEqual(L.pickerPool(ws, 0, "Tech").map((w) => w.name), ["a", "d"]);
  assert.equal(L.pickerPool(ws, 10, "all").length, 0);
  assert.equal(L.pickRandom([], null), null);
  const pool = L.pickerPool(ws, 0, "all");
  for (let i = 0; i < 50; i++) assert.notEqual(L.pickRandom(pool, pool[0].id)!.id, pool[0].id);
  assert.equal(L.pickRandom([pool[0]], pool[0].id)!.id, pool[0].id);
  assert.equal(L.filterWishes(ws, "all", "priority", "", "all")[0].name, "b".length ? "d" : "");
  assert.equal(L.filterWishes(ws, "purchased", "newest", "", "all").length, 1);
});

test("migration: v1 state gains new fields", () => {
  const p = L.normalizePersisted({ tasks: [{ id: "1", title: "t", notes: "", priority: "high", due: "2026-01-01", done: false }], reminders: [{ id: "2", title: "r", desc: "", date: "2026-01-01", time: "08:00", done: false, nid: "abc" }], wishlist: [{ id: "3", name: "w", price: 5, purchased: false }], name: "Ama", notify: true });
  assert.equal(p.tasks[0].category, ""); assert.equal(p.reminders[0].nid, undefined);
  assert.equal(p.wishlist[0].priority, "medium"); assert.equal(p.currency, "GH₵"); assert.equal(p.haptics, true); assert.equal(p.name, "Ama");
  assert.deepEqual(L.normalizePersisted(null).tasks, []);
});

test("backup: round trip, PWA format, validation, merge", () => {
  const p = L.normalizePersisted({ tasks: [{ id: "1", title: "t" }], wishlist: [{ id: "3", name: "w", price: 5 }], currency: "$" });
  const out = L.parseBackup(L.exportBackup(p));
  assert.ok(out.ok && out.backup.tasks.length === 1 && out.backup.currency === "$");
  const pwa = JSON.stringify({ app: "DAYMARK", schemaVersion: 1, data: {
    tasks: [{ id: "a", title: "Pay rent", description: "d", priority: "urgent", dueDate: "2026-11-20", dueTime: "08:00", category: "Bills", completed: true, completedAt: 5, createdAt: 9 }],
    reminders: [{ id: "b", title: "Call", reminderDate: "2026-11-21", reminderTime: "14:30", completed: false }],
    wishlist: [{ id: "c", name: "Laptop", estimatedPrice: 5000, productUrl: "https://x.test", priority: "high", purchased: false, notes: "n" }],
    settings: [{ key: "currency", value: "€" }] } });
  const r = L.parseBackup(pwa);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual([r.backup.tasks[0].due, r.backup.tasks[0].done, r.backup.tasks[0].notes, r.backup.tasks[0].dueTime], ["2026-11-20", true, "d", "08:00"]);
    assert.deepEqual([r.backup.reminders[0].date, r.backup.reminders[0].time], ["2026-11-21", "14:30"]);
    assert.deepEqual([r.backup.wishlist[0].price, r.backup.wishlist[0].url, r.backup.wishlist[0].priority], [5000, "https://x.test", "high"]);
    assert.equal(r.backup.currency, "€");
  }
  for (const bad of ["nope", "{}", JSON.stringify({ app: "DAYMARK", tasks: [{ id: "1" }] }), JSON.stringify({ app: "DAYMARK", tasks: "x" }), JSON.stringify({ app: "DAYMARK", reminders: [{ id: "1", title: "t", date: "bad" }] })])
    assert.equal(L.parseBackup(bad).ok, false);
  const m = L.mergeById([{ id: "1", v: "old" }, { id: "2", v: "keep" }], [{ id: "1", v: "new" }]);
  assert.deepEqual(m, [{ id: "1", v: "new" }, { id: "2", v: "keep" }]);
});
