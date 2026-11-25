import { Text, View } from "react-native";
import { Card, C, H2, Muted, Screen, Empty, s } from "../../src/lib/ui";
import { money, PRI, reminderDate, today, useStore } from "../../src/lib/store";

export default function Dashboard() {
  const st = useStore();
  const td = today();
  const open = st.tasks.filter((t) => !t.done);
  const dueToday = open.filter((t) => t.due === td);
  const overdue = open.filter((t) => !!t.due && t.due < td);
  const blockers = [...open].filter((t) => t.priority === "urgent" || t.priority === "high").sort((a, b) => PRI[b.priority] - PRI[a.priority]).slice(0, 3);
  const up = st.reminders.filter((r) => !r.done).sort((a, b) => +reminderDate(a) - +reminderDate(b)).slice(0, 3);
  const wl = st.wishlist.filter((w) => !w.purchased);
  const bought = st.wishlist.filter((w) => w.purchased);
  const h = new Date().getHours();
  const greet = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (st.name ? `, ${st.name}` : "");
  const kpis: [number, string, boolean?][] = [
    [open.length, "tasks open"],
    [dueToday.length, "due today"],
    [overdue.length, "overdue", overdue.length > 0],
    [st.tasks.length - open.length, "completed"],
  ];
  return (
    <Screen title={greet} sub={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      {st.error ? <Muted t={st.error} bad /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {kpis.map(([n, l, bad]) => (
          <View key={l} style={[s.card, { width: "48%", marginBottom: 0 }]}>
            <Text style={{ color: bad ? C.bad : C.tx, fontSize: 28, fontWeight: "600" }}>{n}</Text>
            <Muted t={l} bad={bad} />
          </View>
        ))}
      </View>
      <H2 t="Today’s tasks" />
      {dueToday.length ? dueToday.slice(0, 4).map((t) => (
        <Card key={t.id}><Text style={{ color: C.tx }}>{t.title}</Text><Muted t={[t.priority, t.dueTime, t.category].filter(Boolean).join(" · ")} /></Card>
      )) : <Empty t="Clear for today" sub="No open tasks due today." />}
      <H2 t="Priority blockers" />
      {blockers.length ? blockers.map((t) => (
        <Card key={t.id} accent={t.priority === "urgent" ? C.bad : C.ac}>
          <Text style={{ color: C.tx }}>{t.title}</Text>
          <Muted t={[t.priority, t.due && `due ${t.due}`, t.dueTime, t.category].filter(Boolean).join(" · ")} bad={!!t.due && t.due < td} />
        </Card>
      )) : <Empty t="No high-priority blockers" sub="Urgent and high-priority tasks appear here." />}
      <H2 t="Upcoming reminders" />
      {up.length ? up.map((r) => <Card key={r.id}><Text style={{ color: C.tx }}>{r.title}</Text><Muted t={`${r.date} at ${r.time}`} bad={reminderDate(r) < new Date()} /></Card>) : <Empty t="No reminders" sub="Add one in the Reminders tab." />}
      <H2 t="Wishlist" />
      <Card>
        <Text style={{ color: C.tx, fontWeight: "600" }}>{wl.length} item{wl.length === 1 ? "" : "s"} waiting</Text>
        <Muted t={`${money(wl.reduce((a, w) => a + w.price, 0), st.currency)} estimated · ${bought.length} acquired (${money(bought.reduce((a, w) => a + w.price, 0), st.currency)})`} />
      </Card>
    </Screen>
  );
}
