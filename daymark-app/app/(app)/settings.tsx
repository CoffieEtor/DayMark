import { useState } from "react";
import { Alert, Share, Switch, Text, View } from "react-native";
import { Btn, Card, C, H2, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { clearAll, enableNotifications, exportJson, importJson, previewBackup, setCurrency, setHaptics, setName, useStore } from "../../src/lib/store";
import { CURRENCIES } from "../../src/lib/logic";

export default function Settings() {
  const { name, notify, currency, haptics, tasks, reminders, wishlist } = useStore();
  const [nm, setNm] = useState(name);
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState("");

  const run = async (mode: "merge" | "replace") => {
    const r = await importJson(imp, mode);
    setMsg(r.ok ? `Imported ${r.counts.tasks} tasks, ${r.counts.reminders} reminders, ${r.counts.wishlist} wishlist items.` : r.error);
    if (r.ok) setImp("");
  };
  const startImport = () => {
    const p = previewBackup(imp);
    if (!p.ok) return setMsg(p.error);
    const { tasks: t, reminders: r, wishlist: w } = p.backup;
    Alert.alert("Import backup", `${t.length} tasks, ${r.length} reminders, ${w.length} wishlist items.\n\nMerge keeps your current data and updates items with the same id. Replace overwrites everything.`, [
      { text: "Cancel", style: "cancel" }, { text: "Merge", onPress: () => run("merge") }, { text: "Replace", style: "destructive", onPress: () => run("replace") },
    ]);
  };
  return (
    <Screen title="Settings">
      <H2 t="Profile" />
      <Input placeholder="Your name" value={nm} onChangeText={setNm} onEndEditing={() => setName(nm.trim())} />
      <H2 t="Preferences" />
      <Muted t="Currency" />
      <Seg opts={CURRENCIES.map((c) => [c, c] as [string, string])} value={currency} on={setCurrency} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ color: C.tx }}>Haptic feedback</Text>
        <Switch value={haptics} onValueChange={setHaptics} trackColor={{ true: C.ac, false: C.line }} accessibilityLabel="Haptic feedback" />
      </View>
      <H2 t="Notifications" />
      <Card>
        <Muted t={notify ? "Enabled. Reminders alert you even when DAYMARK is closed." : "Off. Enable to get reminder alerts."} />
        <Row><Btn label={notify ? "Re-check permission" : "Enable notifications"} onPress={async () => setMsg((await enableNotifications()) ? "Notifications enabled." : "Permission denied. Enable it in iPhone Settings → DAYMARK.")} /></Row>
      </Card>
      <H2 t="Data" />
      <Muted t="Your data lives on this phone. Deleting the app erases it, so export a backup now and then. Backups from the DAYMARK web app can be imported here too." />
      <Row><Btn label="Export backup" kind="ghost" onPress={() => Share.share({ message: exportJson() })} /></Row>
      <Input placeholder="Paste a backup here to import" value={imp} onChangeText={setImp} multiline style={{ minHeight: 70 }} />
      <Row><Btn label="Import backup" kind="ghost" disabled={!imp.trim()} onPress={startImport} />
        <Btn label="Clear all data" kind="bad" onPress={() => Alert.alert("Delete everything?", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await clearAll(); setMsg("All data cleared."); } }])} /></Row>
      {msg ? <Text style={{ color: C.ac }} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <H2 t="About" />
      <Card><Text style={{ color: C.tx, fontWeight: "600" }}>DAYMARK</Text><Muted t={`Version 1.1.0 · Currency ${currency}`} />
        <Muted t={`${tasks.length} tasks · ${reminders.length} reminders · ${wishlist.length} wishlist items · notifications ${notify ? "on" : "off"}`} /></Card>
    </Screen>
  );
}
