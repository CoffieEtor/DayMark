import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, Input, useAccent } from "../../src/lib/ui";
import { completeOnboarding, setAddressAs, setName, useStore } from "../../src/lib/store";
import { haptic } from "../../src/haptics";

const STEPS = 5;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const ac = useAccent();
  const store = useStore();
  const [step, setStep] = useState(0);
  const [nm, setNm] = useState(store.name);
  const [addr, setAddr] = useState(store.addressAs);

  const suggestions = [
    ...(nm.trim() ? [nm.trim()] : []),
    "Friend",
    "Chief",
    "Boss",
    "Captain",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const enterApp = async (showTour: boolean) => {
    haptic.success();
    if (nm.trim()) await setName(nm.trim());
    if (addr.trim()) await setAddressAs(addr.trim());
    await completeOnboarding(showTour);
    router.replace("/(app)");
  };

  return (
    <View style={[st.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={st.topRow}>
        <View style={st.dashes}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[st.dash, { backgroundColor: i <= step ? ac : C.line }]} />
          ))}
        </View>
        <Pressable hitSlop={10} onPress={() => void enterApp(false)} style={st.skipBtn}>
          <Text style={st.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={st.body}>
        {step === 0 ? (
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: ac }]}>WELCOME TO DAYMARK</Text>
            <Text style={st.title}>Calm clarity for every day.</Text>
            <Text style={st.desc}>Organize tasks, time-sensitive reminders, and intentional purchases in one quiet space.</Text>
            <View style={st.noteCard}>
              <Text style={st.noteText}>Everything stays on this device. No account needed.</Text>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: ac }]}>OVERVIEW</Text>
            <Text style={st.title}>Three pillars, zero clutter.</Text>
            {[
              ["Tasks", "Prioritize daily work, due dates, categories, and checklists."],
              ["Reminders", "Schedule timely alerts with one-tap snooze controls."],
              ["Wishlist", "Curate planned buys and let Pick for me break ties."],
            ].map(([t, d]) => (
              <View key={t} style={st.card}>
                <Text style={[st.cardTitle, { color: ac }]}>{t}</Text>
                <Text style={st.cardDesc}>{d}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: ac }]}>YOUR NAME</Text>
            <Text style={st.title}>What should we call you?</Text>
            <Text style={st.desc}>Used only on this device for your personal greeting.</Text>
            <Input
              placeholder="Enter your name"
              value={nm}
              onChangeText={setNm}
              autoFocus
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: ac }]}>ADDRESS AS</Text>
            <Text style={st.title}>How should DAYMARK greet you?</Text>
            <Text style={st.desc}>Pick a greeting style or type your own nickname.</Text>
            <Input
              placeholder="Preferred greeting (optional)"
              value={addr}
              onChangeText={setAddr}
            />
            <View style={st.chips}>
              {suggestions.map((opt) => {
                const active = addr === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => { haptic.selection(); setAddr(opt); }}
                    style={[st.chip, active && { borderColor: ac, backgroundColor: C.s2 }]}
                  >
                    <Text style={{ color: active ? ac : C.tx, fontWeight: active ? "600" : "400" }}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: ac }]}>ALL SET</Text>
            <Text style={st.title}>Ready, {(addr || nm).trim() || "friend"}.</Text>
            <Text style={st.desc}>Your local workspace is ready. Take a quick 4-step tour inside or start right away.</Text>
          </View>
        ) : null}
      </View>

      <View style={st.footer}>
        {step > 0 ? (
          <Pressable
            onPress={() => { haptic.selection(); setStep((s) => s - 1); }}
            style={st.pillGhost}
          >
            <Text style={st.pillGhostText}>Previous</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => {
            if (step < STEPS - 1) {
              haptic.selection();
              setStep((s) => s + 1);
            } else {
              void enterApp(true);
            }
          }}
          style={[st.pillMain, { backgroundColor: ac }]}
        >
          <Text style={st.pillMainText}>{step === STEPS - 1 ? "Enter App" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 22, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  dashes: { flex: 1, flexDirection: "row", gap: 6 },
  dash: { flex: 1, height: 4, borderRadius: 4 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  skipText: { color: C.mu, fontSize: 14, fontWeight: "600" },
  body: { flex: 1, justifyContent: "center" },
  section: { gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.8 },
  title: { color: C.tx, fontSize: 30, fontWeight: "700", lineHeight: 36 },
  desc: { color: C.mu, fontSize: 16, lineHeight: 23 },
  noteCard: { backgroundColor: C.s1, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6 },
  noteText: { color: C.tx, fontSize: 14 },
  card: { backgroundColor: C.s1, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  cardDesc: { color: C.mu, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.s1 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pillGhost: { borderRadius: 999, borderColor: C.line, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 11, backgroundColor: C.s1 },
  pillGhostText: { color: C.tx, fontWeight: "600" },
  pillMain: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11 },
  pillMainText: { color: "#101114", fontWeight: "700" },
});
