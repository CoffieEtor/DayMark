import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, CardMenu, C, Check, Empty, FormSheet, H2, Muted, Row, Screen } from "../../src/lib/ui";
import { delReminder, isValidDate, isValidTime, Reminder, reminderDate, saveReminder, today, tomorrow, uid, useStore } from "../../src/lib/store";

const FIELDS = [{ k: "title", label: "Title", required: true }, { k: "desc", label: "Description", multiline: true },
  { k: "date", label: "Date (YYYY-MM-DD)", required: true }, { k: "time", label: "Time (HH:MM, 24-hour)", required: true }];
export default function Reminders() {
  const { reminders, notify } = useStore();
  const [edit, setEdit] = useState<Reminder | "new" | null>(null);
  const card = (r: Reminder) => {
    const over = !r.done && reminderDate(r) < new Date();
    return (
      <Card key={r.id} done={r.done}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Check on={r.done} label={`${r.done ? "Reopen" : "Complete"} ${r.title}`} onPress={() => saveReminder({ ...r, done: !r.done })} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.tx }}>{r.title}</Text>{r.desc ? <Muted t={r.desc} /> : null}
            <Muted t={(over ? "Overdue · " : "") + `${r.date} at ${r.time}`} bad={over} />
          </View>
          <CardMenu label={r.title} onEdit={() => setEdit(r)} onDelete={() => delReminder(r.id)} />
        </View>
      </Card>
    );
  };
  const now = new Date();
  const td = today();
  const tm = tomorrow();
  const act = reminders.filter((r) => !r.done).sort((a, b) => +reminderDate(a) - +reminderDate(b));
  const overdue = act.filter((r) => reminderDate(r) < now);
  const dueToday = act.filter((r) => reminderDate(r) >= now && r.date === td);
  const dueTomorrow = act.filter((r) => reminderDate(r) >= now && r.date === tm);
  const upcoming = act.filter((r) => reminderDate(r) >= now && r.date > tm);
  const done = reminders.filter((r) => r.done);
  return (
    <Screen title="Reminders" sub={notify ? "Alerts are on, even when the app is closed." : "In-app alerts are active. Enable push in Settings for background alerts."}>
      <Row><Btn label="Add reminder" onPress={() => setEdit("new")} /></Row>
      {overdue.length ? <><H2 t="Overdue" />{overdue.map(card)}</> : null}
      {dueToday.length ? <><H2 t="Today" />{dueToday.map(card)}</> : null}
      {dueTomorrow.length ? <><H2 t="Tomorrow" />{dueTomorrow.map(card)}</> : null}
      <H2 t="Upcoming" />
      {upcoming.length ? upcoming.map(card) : !overdue.length && !dueToday.length && !dueTomorrow.length ? <Empty t="No reminders" sub="Add one with a date and time." /> : <Muted t="Nothing scheduled beyond tomorrow." />}
      {done.length ? <><H2 t="Completed" />{done.map(card)}</> : null}
      {edit ? <FormSheet title={edit === "new" ? "New reminder" : "Edit reminder"} fields={FIELDS} initial={edit === "new" ? { date: today(), time: "09:00" } : { ...edit } as any}
        onClose={() => setEdit(null)} onSave={(v) => {
          const date = v.date.trim();
          const time = v.time.trim();
          if (!isValidDate(date)) return "Enter a valid date (YYYY-MM-DD).";
          if (!isValidTime(time)) return "Enter a valid 24-hour time (HH:MM).";
          saveReminder({ id: edit === "new" ? uid() : edit.id, done: edit === "new" ? false : edit.done, nid: edit === "new" ? null : edit.nid, title: v.title.trim(), desc: v.desc ?? "", date, time });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
