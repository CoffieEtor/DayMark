import { Text, View } from "react-native";
import { Card, C, H2, Muted, Screen, Empty, s } from "../../src/lib/ui";
import { money, useStore } from "../../src/lib/store";
import { dashboardStats, isTaskOverdue, reminderWhen, wishStats } from "../../src/lib/logic";

export default function Dashboard() {
  const st = useStore();
  const now = new Date();
  const d = dashboardStats(st.tasks, st.reminders, now);
  const w = wishStats(st.wishlist);
  const h = now.getHours();
  const greet = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (st.name ? `, ${st.name}` : "");
  const kpis: [number, string, boolean?][] = [[d.open, "open"], [d.dueToday.length, "due today"], [d.overdue, "overdue", d.overdue > 0], [d.completed, "done"]];
  return (
    <Screen title={greet} sub={now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      {st.error ? <Muted t={st.error} bad /> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {kpis.map(([n, l, bad]) => (
          <View key={l} style={[s.card, { flex: 1, paddingHorizontal: 10 }]}><Text style={{ color: bad ? C.bad : C.tx, fontSize: 26, fontWeight: "600" }}>{n}</Text><Muted t={l} /></View>
        ))}
      </View>
      <H2 t="Today" />
      {d.dueToday.length ? d.dueToday.map((t) => <Card key={t.id}><Text style={{ color: C.tx }}>{t.title}</Text><Muted t={[t.priority, t.dueTime].filter(Boolean).join(" · ")} bad={isTaskOverdue(t, now)} /></Card>) : <Empty t="Nothing due today" sub="Add a task in the Tasks tab." />}
      {d.blockers.length ? <><H2 t="High-priority blockers" />{d.blockers.slice(0, 3).map((t) => <Card key={t.id} accent={t.priority === "urgent" ? C.bad : C.ac}><Text style={{ color: C.tx }}>{t.title}</Text><Muted t={t.priority + (t.due ? ` · due ${t.due}` : "")} bad={isTaskOverdue(t, now)} /></Card>)}</> : null}
      <H2 t="Upcoming reminders" />
      {d.upcoming.length ? d.upcoming.map((r) => <Card key={r.id}><Text style={{ color: C.tx }}>{r.title}</Text><Muted t={`${r.date} at ${r.time}`} bad={reminderWhen(r) < now} /></Card>) : <Empty t="No reminders" sub="Add one in the Reminders tab." />}
      <H2 t="Wishlist" />
      <Card><Text style={{ color: C.tx, fontWeight: "600" }}>{w.remaining} item{w.remaining === 1 ? "" : "s"} waiting</Text><Muted t={money(w.remainingCost, st.currency) + " estimated · " + money(w.acquiredCost, st.currency) + " acquired"} /></Card>
    </Screen>
  );
}
