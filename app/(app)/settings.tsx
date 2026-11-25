import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View } from "react-native";
import { Btn, Card, C, H2, Input, Muted, Row, Screen, Seg, useAccent } from "../../src/lib/ui";
import {
  ACCENTS,
  AccentKey,
  clearAll,
  CurrencyCode,
  enableNotifications,
  exportJson,
  importJson,
  sendTestNotification,
  setAccent,
  setAddressAs,
  setCurrency,
  setHaptics,
  setName,
  startTour,
  useStore,
} from "../../src/lib/store";
import { haptic } from "../../src/haptics";

export default function Settings() {
  const { name, addressAs, notify, currency, accent, hapticsEnabled, tasks, reminders, wishlist } = useStore();
  const ac = useAccent();
  const [nm, setNm] = useState(name);
  const [addr, setAddr] = useState(addressAs);
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { setNm(name); }, [name]);
  useEffect(() => { setAddr(addressAs); }, [addressAs]);

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
      <Input placeholder="Your name" value={nm} onChangeText={setNm} onEndEditing={() => void setName(nm.trim())} />
      <View style={{ height: 8 }} />
      <Input placeholder="How DAYMARK addresses you (nickname)" value={addr} onChangeText={setAddr} onEndEditing={() => void setAddressAs(addr.trim())} />
      <Row><Btn label="Replay Quick Tour" kind="ghost" onPress={() => startTour()} /></Row>

      <H2 t="Appearance & Theme" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
          const item = ACCENTS[key];
          const active = accent === key;
          return (
            <Pressable
              key={key}
              onPress={() => { haptic.selection(); void setAccent(key); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: C.s1,
                borderWidth: 1,
                borderColor: active ? item.hex : C.line,
              }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.hex }} />
              <Text style={{ color: active ? item.hex : C.tx, fontWeight: active ? "600" : "400" }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <H2 t="Haptics" />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: C.tx, fontWeight: "600" }}>Tactile haptic feedback</Text>
            <Muted t={hapticsEnabled ? "Enabled for taps, toggles, and completions." : "Muted across the app."} />
          </View>
          <Btn label={hapticsEnabled ? "On" : "Off"} kind={hapticsEnabled ? "main" : "ghost"} onPress={() => void setHaptics(!hapticsEnabled)} />
        </View>
      </Card>

      <H2 t="Currency & Region" />
      <Seg<CurrencyCode>
        opts={[["GHS", "GH₵ (GHS)"], ["USD", "$ (USD)"], ["EUR", "€ (EUR)"], ["GBP", "£ (GBP)"], ["NGN", "₦ (NGN)"], ["KES", "KSh (KES)"]]}
        value={currency}
        on={setCurrency}
      />

      <H2 t="Notifications" />
      <Card>
        <Muted t={notify ? "Permission granted. Reminders alert you even when DAYMARK is closed." : "Off. Enable to get OS reminder alerts."} />
        <Row>
          <Btn
            label={notify ? "Re-check permission" : "Enable notifications"}
            onPress={async () => setMsg((await enableNotifications()) ? "Notifications enabled." : "Permission denied or unavailable on this platform.")}
          />
          <Btn
            label="Send test notification"
            kind="ghost"
            onPress={async () => setMsg((await sendTestNotification()) ? "Test notification scheduled (2s)." : "Could not send test notification.")}
          />
        </Row>
      </Card>

      <H2 t="Data Backup & Recovery" />
      <Card>
        <Text style={{ color: C.tx, fontWeight: "600" }}>Local storage</Text>
        <Muted t={`${tasks.length} tasks · ${reminders.length} reminders · ${wishlist.length} wishlist items`} />
      </Card>
      <Muted t="Importing merges records by ID without erasing unrelated items." />
      <Row><Btn label="Export JSON backup" kind="ghost" onPress={handleExport} /></Row>
      <Input placeholder="Paste a JSON backup here to merge" value={imp} onChangeText={setImp} multiline style={{ minHeight: 70 }} />
      <Row>
        <Btn
          label="Import & merge"
          kind="ghost"
          disabled={!imp.trim()}
          onPress={async () => {
            setMsg((await importJson(imp)) ? "Backup merged by ID." : "That isn’t a valid DAYMARK backup.");
            setImp("");
          }}
        />
        <Btn
          label="Clear all data"
          kind="bad"
          onPress={() => {
            if (Platform.OS === "web") {
              if (typeof window !== "undefined" && !window.confirm("Delete everything? This cannot be undone.")) return;
              void clearAll().then(() => setMsg("All data cleared."));
              return;
            }
            Alert.alert("Delete everything?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: async () => { await clearAll(); setMsg("All data cleared."); } },
            ]);
          }}
        />
      </Row>
      {msg ? <Text style={{ color: ac, marginTop: 6 }} accessibilityLiveRegion="polite">{msg}</Text> : null}

      <H2 t="About" />
      <Card>
        <Text style={{ color: C.tx, fontWeight: "600" }}>DAYMARK</Text>
        <Muted t={`Version 1.0.0 · Local-first · Currency ${currency}`} />
      </Card>
    </Screen>
  );
}
