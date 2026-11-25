import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Card, CardMenu, C, Check, Empty, Field, FormSheet, H2, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { delReminder, isValidDate, isValidTime, Reminder, reminderDate, saveReminder, snoozeReminder, today, tomorrow, uid, useStore } from "../../src/lib/store";
import { haptic } from "../../src/haptics";

function getFields(): Field[] {
  return [
    { k: "title", label: "Title", required: true },
    { k: "desc", label: "Details", multiline: true },
    {
      k: "date",
      label: "Date (YYYY-MM-DD)",
      required: true,
      presets: [
        { label: "Today", value: today() },
        { label: "Tomorrow", value: tomorrow() },
      ],
    },
    {
      k: "time",
      label: "Time (HH:MM, 24-hour)",
      required: true,
      presets: [
        { label: "Morning 9:00 AM", value: "09:00" },
        { label: "Afternoon 1:00 PM", value: "13:00" },
        { label: "Evening 6:00 PM", value: "18:00" },
        { label: "Night 8:30 PM", value: "20:30" },
      ],
    },
  ];
}

export default function Reminders() {
  const { reminders, notify } = useStore();
  const [f, setF] = useState<"all" | "today" | "tomorrow" | "upcoming" | "overdue" | "completed">("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Reminder | "new" | null>(null);

  const now = new Date();
  const td = today();
  const tm = tomorrow();

  const matches = (r: Reminder) => (r.title + r.desc).toLowerCase().includes(q.toLowerCase());
  const act = reminders.filter((r) => !r.done && matches(r)).sort((a, b) => +reminderDate(a) - +reminderDate(b));
  const overdue = act.filter((r) => reminderDate(r) < now);
  const dueToday = act.filter((r) => reminderDate(r) >= now && r.date === td);
  const dueTomorrow = act.filter((r) => reminderDate(r) >= now && r.date === tm);
  const upcoming = act.filter((r) => reminderDate(r) >= now && r.date > tm);
  const done = reminders.filter((r) => r.done && matches(r));

  const card = (r: Reminder) => {
    const over = !r.done && reminderDate(r) < now;
    return (
      <Card key={r.id} done={r.done} accent={over ? C.bad : undefined}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Check on={r.done} label={`${r.done ? "Reopen" : "Complete"} ${r.title}`} onPress={() => saveReminder({ ...r, done: !r.done })} />
          <View style={{ flex: 1 }}>
            <Text style={[{ color: C.tx, fontWeight: "500" }, r.done && { textDecorationLine: "line-through" }]}>{r.title}</Text>
            {r.desc ? <Muted t={r.desc} /> : null}
            <Muted t={(over ? "Overdue · " : "") + `${r.date} at ${r.time}`} bad={over} />
            {!r.done ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={() => { haptic.selection(); void snoozeReminder(r, "1h"); }}
                  style={{ borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.s2 }}
                >
                  <Text style={{ color: C.tx, fontSize: 12 }}>+1h</Text>
                </Pressable>
                <Pressable
                  onPress={() => { haptic.selection(); void snoozeReminder(r, "tomorrow"); }}
                  style={{ borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.s2 }}
                >
                  <Text style={{ color: C.tx, fontSize: 12 }}>Tomorrow 9 AM</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          <CardMenu label={r.title} onEdit={() => setEdit(r)} onDelete={() => delReminder(r.id)} />
        </View>
      </Card>
    );
  };

  const renderFlat = (items: Reminder[], emptyTitle: string) =>
    items.length ? items.map(card) : <Empty t={emptyTitle} sub="Reminders matching this filter appear here." />;

  return (
    <Screen title="Reminders" sub={notify ? "OS alerts are on, even when DAYMARK is closed." : "In-app alerts are active. Enable OS notifications in Settings."}>
      <Row><Btn label="Add reminder" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["all", "All"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["completed", "Completed"]]} value={f} on={setF} />
      <Input placeholder="Search reminders" value={q} onChangeText={setQ} />

      {f === "all" ? (
        <>
          {overdue.length ? <><H2 t="Overdue" />{overdue.map(card)}</> : null}
          {dueToday.length ? <><H2 t="Today" />{dueToday.map(card)}</> : null}
          {dueTomorrow.length ? <><H2 t="Tomorrow" />{dueTomorrow.map(card)}</> : null}
          <H2 t="Upcoming" />
          {upcoming.length ? upcoming.map(card) : !overdue.length && !dueToday.length && !dueTomorrow.length ? <Empty t="No reminders" sub="Add one with a date and time." /> : <Muted t="Nothing scheduled beyond tomorrow." />}
          {done.length ? <><H2 t="Completed" />{done.map(card)}</> : null}
        </>
      ) : null}
      {f === "today" ? <View style={{ marginTop: 10 }}>{renderFlat(dueToday, "No reminders today")}</View> : null}
      {f === "tomorrow" ? <View style={{ marginTop: 10 }}>{renderFlat(dueTomorrow, "No reminders tomorrow")}</View> : null}
      {f === "upcoming" ? <View style={{ marginTop: 10 }}>{renderFlat(upcoming, "No upcoming reminders")}</View> : null}
      {f === "overdue" ? <View style={{ marginTop: 10 }}>{renderFlat(overdue, "No overdue reminders")}</View> : null}
      {f === "completed" ? <View style={{ marginTop: 10 }}>{renderFlat(done, "No completed reminders")}</View> : null}

      {edit ? (
        <FormSheet
          title={edit === "new" ? "New reminder" : "Edit reminder"}
          fields={getFields()}
          initial={edit === "new" ? { date: td, time: "09:00" } : { ...edit } as any}
          onClose={() => setEdit(null)}
          onSave={(v) => {
            const date = v.date.trim();
            const time = v.time.trim();
            if (!isValidDate(date)) return "Enter a valid date (YYYY-MM-DD).";
            if (!isValidTime(time)) return "Enter a valid 24-hour time (HH:MM).";
            void saveReminder({ id: edit === "new" ? uid() : edit.id, done: edit === "new" ? false : edit.done, nid: edit === "new" ? null : edit.nid, title: v.title.trim(), desc: v.desc ?? "", date, time });
            setEdit(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
