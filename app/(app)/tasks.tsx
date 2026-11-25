import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, CardMenu, C, Check, Empty, FormSheet, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { delTask, isValidDate, isValidTime, PRI, saveTask, Task, today, uid, useStore } from "../../src/lib/store";

const FIELDS = [
  { k: "title", label: "Title", required: true },
  { k: "notes", label: "Notes", multiline: true },
  { k: "priority", label: "Priority", options: ["low", "normal", "high", "urgent"] },
  { k: "category", label: "Category", placeholder: "Work, Personal, Errands" },
  { k: "due", label: "Due date (YYYY-MM-DD)", placeholder: "2026-11-25" },
  { k: "dueTime", label: "Due time (HH:MM, 24-hour)", placeholder: "14:30" },
];
export default function Tasks() {
  const { tasks } = useStore();
  const [f, setF] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");
  const [sort, setSort] = useState<"due" | "priority" | "created" | "alpha">("due");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Task | "new" | null>(null);
  const td = today();
  const list = tasks
    .filter((t) => ({ all: true, today: !t.done && t.due === td, upcoming: !t.done && t.due > td, overdue: !t.done && !!t.due && t.due < td, completed: t.done })[f]
      && (t.title + t.notes + t.category).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === "priority") return PRI[b.priority] - PRI[a.priority];
      if (sort === "created") return (b.createdAt || 0) - (a.createdAt || 0);
      if (sort === "alpha") return a.title.localeCompare(b.title);
      return (a.due || "9").localeCompare(b.due || "9") || (a.dueTime || "9").localeCompare(b.dueTime || "9");
    });
  return (
    <Screen title="Tasks">
      <Row><Btn label="Add task" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["all", "All"], ["today", "Today"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["completed", "Completed"]]} value={f} on={setF} />
      <Input placeholder="Search tasks" value={q} onChangeText={setQ} />
      <Seg opts={[["due", "Due date"], ["priority", "Priority"], ["created", "Recent"], ["alpha", "A–Z"]]} value={sort} on={setSort} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((t) => {
          const over = !t.done && !!t.due && t.due < td;
          return (
            <Card key={t.id} done={t.done} accent={!t.done && t.priority === "urgent" ? C.bad : !t.done && t.priority === "high" ? C.ac : undefined}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Check on={t.done} label={`${t.done ? "Reopen" : "Complete"} ${t.title}`} onPress={() => saveTask({ ...t, done: !t.done })} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: C.tx }, t.done && { textDecorationLine: "line-through" }]}>{t.title}</Text>
                  {t.notes ? <Muted t={t.notes} /> : null}
                  <Muted t={[t.priority, t.category, t.due && (over ? "Overdue · " : "") + t.due + (t.dueTime ? ` ${t.dueTime}` : "")].filter(Boolean).join(" · ")} bad={over} />
                </View>
                <CardMenu label={t.title} onEdit={() => setEdit(t)} onDelete={() => delTask(t.id)} />
              </View>
            </Card>
          );
        }) : <Empty t="No tasks here" sub="Tasks you add show up in this view." />}
      </View>
      {edit ? <FormSheet title={edit === "new" ? "New task" : "Edit task"} fields={FIELDS} initial={edit === "new" ? { priority: "normal" } as any : { ...edit } as any}
        onClose={() => setEdit(null)} onSave={(v) => {
          const due = v.due?.trim() ?? "";
          const dueTime = v.dueTime?.trim() ?? "";
          if (due && !isValidDate(due)) return "Enter a valid due date (YYYY-MM-DD).";
          if (dueTime && !isValidTime(dueTime)) return "Enter a valid 24-hour time (HH:MM).";
          saveTask({ id: edit === "new" ? uid() : edit.id, done: edit === "new" ? false : edit.done, createdAt: edit === "new" ? Date.now() : (edit.createdAt || Date.now()), title: v.title.trim(), notes: v.notes ?? "", priority: (v.priority as Task["priority"]) ?? "normal", category: v.category?.trim() ?? "", due, dueTime });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
