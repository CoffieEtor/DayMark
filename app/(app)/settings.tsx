import { useEffect, useState } from "react";
import { Alert, Platform, Share, Text } from "react-native";
import { Btn, Card, C, H2, Input, Muted, Row, Screen, Seg } from "../../src/lib/ui";
import { clearAll, CurrencyCode, enableNotifications, exportJson, importJson, setCurrency, setName, useStore } from "../../src/lib/store";

export default function Settings() {
  const { name, notify, currency } = useStore();
  const [nm, setNm] = useState(name);
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { setNm(name); }, [name]);
  const handleExport = () => {
    const json = exportJson();
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daymark-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Backup downloaded.");
      return;
    }
    Share.share({ message: json });
  };
  return (
    <Screen title="Settings">
      <H2 t="Profile" />
      <Input placeholder="Your name" value={nm} onChangeText={setNm} onEndEditing={() => setName(nm.trim())} />
      <H2 t="Currency" />
      <Seg<CurrencyCode> opts={[["GHS", "GH₵ (GHS)"], ["USD", "$ (USD)"], ["EUR", "€ (EUR)"], ["GBP", "£ (GBP)"]]} value={currency} on={setCurrency} />
      <H2 t="Notifications" />
      <Card>
        <Muted t={notify ? "Enabled. Reminders alert you even when DAYMARK is closed." : "Off. Enable to get reminder alerts."} />
        <Row><Btn label={notify ? "Re-check permission" : "Enable notifications"} onPress={async () => setMsg((await enableNotifications()) ? "Notifications enabled." : "Permission denied. Enable it in Device Settings → DAYMARK.")} /></Row>
      </Card>
      <H2 t="Data" />
      <Muted t="Your data lives on this device. Deleting app data erases it, so export a backup now and then." />
      <Row><Btn label="Export backup" kind="ghost" onPress={handleExport} /></Row>
      <Input placeholder="Paste a backup here to import" value={imp} onChangeText={setImp} multiline style={{ minHeight: 70 }} />
      <Row><Btn label="Import backup" kind="ghost" disabled={!imp.trim()} onPress={() => Alert.alert("Replace current data?", "Importing overwrites everything.", [{ text: "Cancel", style: "cancel" }, { text: "Import", onPress: async () => { setMsg((await importJson(imp)) ? "Backup imported." : "That isn’t a valid DAYMARK backup."); setImp(""); } }])} />
        <Btn label="Clear all data" kind="bad" onPress={() => Alert.alert("Delete everything?", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await clearAll(); setMsg("All data cleared."); } }])} /></Row>
      {msg ? <Text style={{ color: C.ac }} accessibilityLiveRegion="polite">{msg}</Text> : null}
      <H2 t="About" /><Card><Text style={{ color: C.tx, fontWeight: "600" }}>DAYMARK</Text><Muted t={`Version 1.0.0 · Dark theme · Currency ${currency}`} /></Card>
    </Screen>
  );
}
