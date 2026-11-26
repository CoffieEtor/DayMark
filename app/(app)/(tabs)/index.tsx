import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Card, H2, Muted, Screen, Empty, s, usePalette, useResponsive } from "../../../src/lib/ui";
import { enableNotifications, money, PRI, reminderDate, today, useStore } from "../../../src/lib/store";
import { haptic } from "../../../src/haptics";

export default function Dashboard() {
  const st = useStore();
  const p = usePalette();
  const r = useResponsive();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const td = today();
  const open = st.tasks.filter((t) => !t.done);
  const todayTasks = st.tasks.filter((t) => t.due === td);
  const todayDone = todayTasks.filter((t) => t.done).length;
  const pct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;
  const overdue = open.filter((t) => !!t.due && t.due < td);
  const blockers = [...open].filter((t) => t.priority === "urgent" || t.priority === "high").sort((a, b) => PRI[b.priority] - PRI[a.priority]).slice(0, 3);
  const actReminders = st.reminders.filter((r) => !r.done).sort((a, b) => +reminderDate(a) - +reminderDate(b));
  const wl = st.wishlist.filter((w) => !w.purchased);
  const bought = st.wishlist.filter((w) => w.purchased);

  const h = new Date().getHours();
  const who = (st.addressAs || st.name).trim();
  const greet = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (who ? `, ${who}` : "");

  const cards: { title: string; count: string | number; sub: string; href: string; warn?: boolean }[] = [
    { title: "Today's Tasks", count: todayTasks.filter((t) => !t.done).length, sub: `${todayDone}/${todayTasks.length} done`, href: "/tasks" },
    { title: "Outstanding", count: open.length, sub: overdue.length ? `${overdue.length} overdue` : "All on track", href: "/tasks", warn: overdue.length > 0 },
    { title: "Reminders", count: actReminders.length, sub: actReminders[0] ? `Next ${actReminders[0].time}` : "None scheduled", href: "/reminders" },
    { title: "Wishlist", count: wl.length, sub: money(wl.reduce((a, w) => a + w.price, 0), st.currency), href: "/wishlist" },
  ];

  return (
    <Screen title={greet} sub={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      {st.error ? <Muted t={st.error} bad /> : null}

      {!st.notify && !bannerDismissed ? (
        <View style={[s.card, { backgroundColor: p.s1, borderColor: p.ac, marginTop: 14 }]}>
          <Text style={{ color: p.tx, fontWeight: "600" }}>Enable reminder notifications</Text>
          <Muted t="Get alerted for scheduled reminders even when DAYMARKED is closed." />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Btn label="Enable" onPress={() => void enableNotifications()} />
            <Btn label="Later" kind="ghost" onPress={() => setBannerDismissed(true)} />
          </View>
        </View>
      ) : null}

      <View style={[s.card, { backgroundColor: p.s1, borderColor: p.line, marginTop: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: p.tx, fontWeight: "600" }}>Daily completion</Text>
          <Text style={{ color: p.ac, fontWeight: "700" }}>{pct}%</Text>
        </View>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: p.s2, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${pct}%`, backgroundColor: p.ac, borderRadius: 999 }} />
        </View>
        <View style={{ marginTop: 6 }}>
          <Muted t={todayTasks.length ? `${todayDone} of ${todayTasks.length} tasks due today completed` : "No tasks scheduled for today yet"} />
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {cards.map((c) => (
          <Pressable
            key={c.title}
            accessibilityRole="button"
            onPress={() => { haptic.selection(); router.navigate(c.href as any); }}
            style={[s.card, { backgroundColor: p.s1, borderColor: p.line, flexBasis: "47%", flexGrow: 1, marginBottom: 0 }]}
          >
            <Text style={{ color: p.mu, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{c.title}</Text>
            <Text style={{ color: c.warn ? p.bad : p.tx, fontSize: r.compact ? 24 : 28, fontWeight: "700", marginVertical: 2 }}>{c.count}</Text>
            <Muted t={c.sub} bad={c.warn} />
          </Pressable>
        ))}
      </View>

      <H2 t="Priority blockers" />
      {blockers.length ? blockers.map((t) => (
        <Card key={t.id} accent={t.priority === "urgent" ? p.bad : p.ac}>
          <Text style={{ color: p.tx }}>{t.title}</Text>
          <Muted t={[t.priority, t.due && `due ${t.due}`, t.dueTime, t.category].filter(Boolean).join(" · ")} bad={!!t.due && t.due < td} />
        </Card>
      )) : <Empty t="No high-priority blockers" sub="Urgent and high-priority tasks appear here." />}

      <H2 t="Upcoming reminders" />
      {actReminders.slice(0, 3).length ? actReminders.slice(0, 3).map((r) => (
        <Card key={r.id}>
          <Text style={{ color: p.tx }}>{r.title}</Text>
          <Muted t={`${r.date} at ${r.time}`} bad={reminderDate(r) < new Date()} />
        </Card>
      )) : <Empty t="No reminders" sub="Add one in the Reminders section." />}

      <H2 t="Wishlist summary" />
      <Card>
        <Text style={{ color: p.tx, fontWeight: "600" }}>{wl.length} item{wl.length === 1 ? "" : "s"} waiting</Text>
        <Muted t={`${money(wl.reduce((a, w) => a + w.price, 0), st.currency)} estimated · ${bought.length} acquired (${money(bought.reduce((a, w) => a + w.price, 0), st.currency)})`} />
      </Card>
    </Screen>
  );
}
