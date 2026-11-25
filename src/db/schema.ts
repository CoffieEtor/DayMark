import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(), title: text("title").notNull(), notes: text("notes").notNull().default(""),
  priority: text("priority").notNull().default("normal"), due: text("due").notNull().default(""),
  dueTime: text("due_time").notNull().default(""), category: text("category").notNull().default(""),
  createdAt: integer("created_at").notNull().default(0),
  done: integer("done", { mode: "boolean" }).notNull().default(false), updatedAt: integer("updated_at").notNull(),
});
export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(), title: text("title").notNull(), desc: text("desc").notNull().default(""),
  date: text("date").notNull(), time: text("time").notNull(), done: integer("done", { mode: "boolean" }).notNull().default(false),
  nid: text("nid"), updatedAt: integer("updated_at").notNull(),
});
export const wishlist = sqliteTable("wishlist", {
  id: text("id").primaryKey(), name: text("name").notNull(), desc: text("desc").notNull().default(""),
  price: real("price").notNull().default(0), url: text("url").notNull().default(""), category: text("category").notNull().default(""),
  notes: text("notes").notNull().default(""),
  purchased: integer("purchased", { mode: "boolean" }).notNull().default(false), updatedAt: integer("updated_at").notNull(),
});
export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
