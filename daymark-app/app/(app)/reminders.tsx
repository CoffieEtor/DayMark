import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, C, Check, confirmDelete, Empty, FormSheet, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { delReminder, saveReminder, toggleReminder, today, uid, useStore, type Reminder } from "../../src/lib/store";
import { filterReminders, isDate, isTime, reminderBucket, snoozeByMinutes, snoozeToTomorrow, type ReminderFilter } from "../../src/lib/logic";

const FIELDS = [{ k: "title", label: "Title", required: true }, { k: "desc", label: "Description", multiline: true },
  { k: "date", label: "Date (YYYY-MM-DD)", required: true }, { k: "time", label: "Time (HH:MM, 24-hour)", required: true }];
export default function Reminders() {
  const { reminders, notify } = useStore();
  const [f, setF] = useState<ReminderFilter>("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Reminder | "new" | null>(null);
  const now = new Date();
  const list = filterReminders(reminders, f, q, now);
  return (
    <Screen title="Reminders" sub={notify ? "Alerts are on, even when the app is closed." : "Notifications are off. Turn them on in Settings."}>
      <Row><Btn label="Add reminder" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["all", "All"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["completed", "Completed"]]} value={f} on={setF} />
      <Input placeholder="Search reminders" value={q} onChangeText={setQ} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((r) => {
          const over = reminderBucket(r, now) === "overdue";
          return (
            <Card key={r.id} done={r.done}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Check on={r.done} label={`${r.done ? "Reopen" : "Complete"} ${r.title}`} onPress={() => toggleReminder(r)} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.tx }}>{r.title}</Text>{r.desc ? <Muted t={r.desc} /> : null}
                  <Muted t={(over ? "Overdue · " : "") + `${r.date} at ${r.time}`} bad={over} />
                  <Row>
                    {!r.done ? <><Btn label="+1h" kind="ghost" onPress={() => saveReminder(snoozeByMinutes(r, 60))} /><Btn label="Tomorrow" kind="ghost" onPress={() => saveReminder(snoozeToTomorrow(r))} /></> : null}
                    <Btn label="Edit" kind="ghost" onPress={() => setEdit(r)} /><Btn label="Delete" kind="bad" onPress={() => confirmDelete(r.title, () => delReminder(r.id))} />
                  </Row>
                </View>
              </View>
            </Card>
          );
        }) : <Empty t="No reminders" sub="Add one with a date and time." />}
      </View>
      {edit ? <FormSheet title={edit === "new" ? "New reminder" : "Edit reminder"} fields={FIELDS}
        initial={edit === "new" ? { date: today(), time: "09:00" } : { title: edit.title, desc: edit.desc, date: edit.date, time: edit.time }}
        onClose={() => setEdit(null)}
        validate={(v) => (!isDate(v.date) ? "Date must look like 2026-11-05." : !isTime(v.time) ? "Time must look like 09:00 (24-hour)." : "")}
        onSave={(v) => {
          const base = edit === "new" ? { id: uid(), done: false, createdAt: Date.now() } : edit;
          saveReminder({ ...base, title: v.title.trim(), desc: v.desc ?? "", date: v.date, time: v.time });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
