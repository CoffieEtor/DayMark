import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Card, CardMenu, C, Check, Empty, Field, FormSheet, Input, Muted, Row, Screen, Seg, s, useAccent } from "../../src/lib/ui";
import { addDays, delTask, isValidDate, isValidTime, PRI, saveTask, Subtask, Task, today, tomorrow, uid, useStore } from "../../src/lib/store";
import { haptic } from "../../src/haptics";

function getFields(): Field[] {
  return [
    { k: "title", label: "Title", required: true },
    { k: "notes", label: "Description", multiline: true },
    { k: "priority", label: "Priority", options: ["low", "normal", "high", "urgent"], optionLabels: { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" } },
    {
      k: "category",
      label: "Category",
      placeholder: "Personal, Work, Finance...",
      presets: ["Personal", "Work", "Finance", "Health", "Shopping"].map((c) => ({ label: c, value: c })),
    },
    {
      k: "due",
      label: "Due date (YYYY-MM-DD)",
      placeholder: today(),
      presets: [
        { label: "Today", value: today() },
        { label: "Tomorrow", value: tomorrow() },
        { label: "+3 Days", value: addDays(3) },
        { label: "+1 Week", value: addDays(7) },
      ],
    },
    { k: "dueTime", label: "Due time (HH:MM, 24-hour)", placeholder: "14:30" },
  ];
}

export default function Tasks() {
  const { tasks } = useStore();
  const ac = useAccent();
  const [f, setF] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");
  const [sort, setSort] = useState<"due" | "priority" | "created" | "alpha">("due");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Task | "new" | null>(null);
  const [draftSubs, setDraftSubs] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");

  const openEditor = (item: Task | "new") => {
    setDraftSubs(item === "new" ? [] : [...(item.subtasks ?? [])]);
    setNewSub("");
    setEdit(item);
  };

  const addDraftSub = () => {
    const title = newSub.trim();
    if (!title) return;
    haptic.light();
    setDraftSubs((prev) => [...prev, { id: uid(), title, done: false }]);
    setNewSub("");
  };

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
      <Row><Btn label="Add task" onPress={() => openEditor("new")} /></Row>
      <Seg opts={[["all", "All"], ["today", "Today"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["completed", "Completed"]]} value={f} on={setF} />
      <Input placeholder="Search tasks" value={q} onChangeText={setQ} />
      <Seg opts={[["due", "Due date"], ["priority", "Priority"], ["created", "Recent"], ["alpha", "A–Z"]]} value={sort} on={setSort} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((t) => {
          const over = !t.done && !!t.due && t.due < td;
          const subs = t.subtasks ?? [];
          const subsDone = subs.filter((x) => x.done).length;
          return (
            <Card key={t.id} done={t.done} accent={over || (!t.done && t.priority === "urgent") ? C.bad : !t.done && t.priority === "high" ? ac : undefined}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Check on={t.done} label={`${t.done ? "Reopen" : "Complete"} ${t.title}`} onPress={() => saveTask({ ...t, done: !t.done })} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: C.tx, fontWeight: "500" }, t.done && { textDecorationLine: "line-through" }]}>{t.title}</Text>
                  {t.notes ? <Muted t={t.notes} /> : null}
                  <Muted
                    t={[
                      t.priority,
                      t.category,
                      t.due && (over ? "Overdue · " : "") + t.due + (t.dueTime ? ` ${t.dueTime}` : ""),
                      subs.length ? `${subsDone}/${subs.length} subtasks` : "",
                    ].filter(Boolean).join(" · ")}
                    bad={over}
                  />
                  {subs.length ? (
                    <View style={{ marginTop: 8, gap: 6 }}>
                      {subs.map((sub) => (
                        <Pressable
                          key={sub.id}
                          onPress={() => {
                            haptic.selection();
                            const nextSubs = subs.map((x) => (x.id === sub.id ? { ...x, done: !x.done } : x));
                            void saveTask({ ...t, subtasks: nextSubs });
                          }}
                          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                        >
                          <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: sub.done ? ac : C.mu, backgroundColor: sub.done ? ac : "transparent", alignItems: "center", justifyContent: "center" }}>
                            {sub.done ? <Text style={{ color: C.bg, fontSize: 10, fontWeight: "700" }}>✓</Text> : null}
                          </View>
                          <Text style={[{ color: C.mu, fontSize: 13 }, sub.done && { textDecorationLine: "line-through" }]}>{sub.title}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                <CardMenu label={t.title} onEdit={() => openEditor(t)} onDelete={() => delTask(t.id)} />
              </View>
            </Card>
          );
        }) : <Empty t="No tasks here" sub="Tasks you add show up in this view." />}
      </View>

      {edit ? (
        <FormSheet
          title={edit === "new" ? "New task" : "Edit task"}
          fields={getFields()}
          initial={edit === "new" ? { priority: "normal" } : { ...edit, subtasks: undefined } as any}
          onClose={() => setEdit(null)}
          extra={(
            <View style={{ marginTop: 12 }}>
              <Text style={s.label}>Checklist subtasks</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Input style={{ flex: 1 }} placeholder="Add a subtask" value={newSub} onChangeText={setNewSub} onSubmitEditing={addDraftSub} />
                <Btn label="Add" kind="ghost" onPress={addDraftSub} />
              </View>
              {draftSubs.map((sub) => (
                <View key={sub.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomColor: C.line, borderBottomWidth: 1 }}>
                  <Pressable onPress={() => setDraftSubs((prev) => prev.map((x) => (x.id === sub.id ? { ...x, done: !x.done } : x)))} style={{ flex: 1 }}>
                    <Text style={[{ color: C.tx }, sub.done && { textDecorationLine: "line-through", color: C.mu }]}>• {sub.title}</Text>
                  </Pressable>
                  <Pressable onPress={() => setDraftSubs((prev) => prev.filter((x) => x.id !== sub.id))} hitSlop={8}>
                    <Text style={{ color: C.bad, fontSize: 12 }}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          onSave={(v) => {
            const due = v.due?.trim() ?? "";
            const dueTime = v.dueTime?.trim() ?? "";
            if (due && !isValidDate(due)) return "Enter a valid due date (YYYY-MM-DD).";
            if (dueTime && !isValidTime(dueTime)) return "Enter a valid 24-hour time (HH:MM).";
            void saveTask({
              id: edit === "new" ? uid() : edit.id,
              done: edit === "new" ? false : edit.done,
              createdAt: edit === "new" ? Date.now() : (edit.createdAt || Date.now()),
              title: v.title.trim(),
              notes: v.notes ?? "",
              priority: (v.priority as Task["priority"]) ?? "normal",
              category: v.category?.trim() ?? "",
              subtasks: draftSubs,
              due,
              dueTime,
            });
            setEdit(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
