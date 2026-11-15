import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, C, Check, confirmDelete, Empty, FormSheet, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { delTask, saveTask, toggleTask, today, uid, useStore, type Task } from "../../src/lib/store";
import { filterTasks, isDate, isTaskOverdue, isTime, type TaskFilter, type TaskSort } from "../../src/lib/logic";

const FIELDS = [
  { k: "title", label: "Title", required: true }, { k: "notes", label: "Notes", multiline: true },
  { k: "priority", label: "Priority", options: ["low", "normal", "high", "urgent"] },
  { k: "category", label: "Category", placeholder: "General" },
  { k: "due", label: "Due date (YYYY-MM-DD)", placeholder: "2026-11-05" }, { k: "dueTime", label: "Due time (HH:MM, 24-hour, optional)", placeholder: "17:30" },
];
export default function Tasks() {
  const { tasks } = useStore();
  const [f, setF] = useState<TaskFilter>("all");
  const [sort, setSort] = useState<TaskSort>("due");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Task | "new" | null>(null);
  const now = new Date();
  const list = filterTasks(tasks, f, sort, q, now);
  return (
    <Screen title="Tasks">
      <Row><Btn label="Add task" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["all", "All"], ["today", "Today"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["completed", "Completed"]]} value={f} on={setF} />
      <Input placeholder="Search tasks" value={q} onChangeText={setQ} />
      <Seg opts={[["due", "Due date"], ["priority", "Priority"], ["created", "Recent"], ["alpha", "A–Z"]]} value={sort} on={setSort} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((t) => {
          const over = isTaskOverdue(t, now);
          return (
            <Card key={t.id} done={t.done} accent={!t.done && t.priority === "urgent" ? C.bad : !t.done && t.priority === "high" ? C.ac : undefined}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Check on={t.done} label={`${t.done ? "Reopen" : "Complete"} ${t.title}`} onPress={() => toggleTask(t)} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: C.tx }, t.done && { textDecorationLine: "line-through" }]}>{t.title}</Text>
                  {t.notes ? <Muted t={t.notes} /> : null}
                  <Muted t={[t.priority, t.category, t.due && (over ? "Overdue · " : "") + t.due + (t.dueTime ? ` ${t.dueTime}` : "")].filter(Boolean).join(" · ")} bad={over} />
                  <Row><Btn label="Edit" kind="ghost" onPress={() => setEdit(t)} /><Btn label="Delete" kind="bad" onPress={() => confirmDelete(t.title, () => delTask(t.id))} /></Row>
                </View>
              </View>
            </Card>
          );
        }) : <Empty t="No tasks here" sub="Tasks you add show up in this view." />}
      </View>
      {edit ? <FormSheet title={edit === "new" ? "New task" : "Edit task"} fields={FIELDS}
        initial={edit === "new" ? { priority: "normal" } : { title: edit.title, notes: edit.notes, priority: edit.priority, category: edit.category, due: edit.due, dueTime: edit.dueTime }}
        onClose={() => setEdit(null)}
        validate={(v) => (v.due && !isDate(v.due) ? "Date must look like 2026-11-05." : v.dueTime && !isTime(v.dueTime) ? "Time must look like 17:30." : v.dueTime && !v.due ? "Add a due date for the time." : "")}
        onSave={(v) => {
          const base = edit === "new" ? { id: uid(), done: false, completedAt: null, createdAt: Date.now() } : edit;
          saveTask({ ...base, title: v.title.trim(), notes: v.notes ?? "", priority: (v.priority as Task["priority"]) ?? "normal", category: (v.category ?? "").trim() || "General", due: v.due ?? "", dueTime: v.dueTime ?? "" });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
