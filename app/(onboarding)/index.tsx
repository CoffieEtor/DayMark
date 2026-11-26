import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, usePalette, useResponsive } from "../../src/lib/ui";
import { completeOnboarding, setAddressAs, setName, useStore } from "../../src/lib/store";
import { getRootTopPaddingPx, isIOSWeb, isWebStandalone, useInstallPrompt } from "../../src/lib/pwa";
import { haptic } from "../../src/haptics";

const STEPS = 5;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const r = useResponsive();
  const store = useStore();
  const { canNativeInstall, triggerInstall } = useInstallPrompt();
  const [installDone, setInstallDone] = useState(
    () => Platform.OS !== "web" || isWebStandalone()
  );
  const [step, setStep] = useState(0);
  const [nm, setNm] = useState(store.name);
  const [addr, setAddr] = useState(store.addressAs);

  const safeTop = Platform.OS === "web"
    ? (isWebStandalone() && getRootTopPaddingPx() === 0 && insets.top === 0 ? 54 : 16)
    : Math.max(insets.top, 12) + 10;
  const safeBottom = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 16) + 12;

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

  if (!installDone) {
    const ios = isIOSWeb();
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <View style={[st.container, { paddingHorizontal: r.pad, maxWidth: 560, width: "100%", alignSelf: "center", paddingTop: safeTop, paddingBottom: safeBottom }]}>
          <View />
          <View style={st.section}>
            <Text style={[st.eyebrow, { color: p.ac }]}>INSTALL APP</Text>
            <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>Add DAYMARKED to your device</Text>
            <Text style={[st.desc, { color: p.mu }]}>
              Install DAYMARKED as an app for full-screen focus, faster launches, and device notification support.
            </Text>

            {ios ? (
              <View style={[st.card, { backgroundColor: p.s1, borderColor: p.line, gap: 8, marginTop: 6 }]}>
                <Text style={[st.cardTitle, { color: p.ac }]}>On iPhone / iPad (Safari)</Text>
                <Text style={{ color: p.tx, fontSize: 14, lineHeight: 20 }}>1. Tap the Share button in Safari’s bottom toolbar.</Text>
                <Text style={{ color: p.tx, fontSize: 14, lineHeight: 20 }}>2. Scroll down and tap "Add to Home Screen".</Text>
                <Text style={{ color: p.tx, fontSize: 14, lineHeight: 20 }}>3. Open DAYMARKED from your Home Screen to finish setup and allow iPhone notifications.</Text>
              </View>
            ) : canNativeInstall ? (
              <View style={[st.noteCard, { backgroundColor: p.s1, borderColor: p.line }]}>
                <Text style={{ color: p.tx, fontSize: 14 }}>Install directly onto your home screen or desktop app launcher with one tap.</Text>
              </View>
            ) : (
              <View style={[st.noteCard, { backgroundColor: p.s1, borderColor: p.line }]}>
                <Text style={{ color: p.tx, fontSize: 14 }}>Use your browser’s menu ("Install app" or "Add to Home Screen") to run DAYMARKED as a standalone app.</Text>
              </View>
            )}
          </View>

          <View style={{ gap: 10 }}>
            {canNativeInstall ? (
              <Pressable
                onPress={async () => {
                  haptic.light();
                  const installed = await triggerInstall();
                  if (installed) setInstallDone(true);
                }}
                style={[st.pillMain, { backgroundColor: p.ac, alignItems: "center" }]}
              >
                <Text style={[st.pillMainText, { color: p.isDark ? "#101114" : "#FFFFFF" }]}>Install DAYMARKED</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => { haptic.selection(); setInstallDone(true); }}
              style={[st.pillGhost, { backgroundColor: p.s1, borderColor: p.line, alignItems: "center" }]}
            >
              <Text style={{ color: p.tx, fontWeight: "600" }}>Continue in browser</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={[st.container, { paddingHorizontal: r.pad, maxWidth: 560, width: "100%", alignSelf: "center", paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={st.topRow}>
          <View style={st.dashes}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View key={i} style={[st.dash, { backgroundColor: i <= step ? p.ac : p.line }]} />
            ))}
          </View>
          <Pressable hitSlop={12} onPress={() => void enterApp(false)} style={st.skipBtn}>
            <Text style={{ color: p.tx, fontSize: 14, fontWeight: "600" }}>Skip</Text>
          </Pressable>
        </View>

        <View style={st.body}>
          {step === 0 ? (
            <View style={st.section}>
              <Text style={[st.eyebrow, { color: p.ac }]}>WELCOME TO DAYMARKED</Text>
              <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>Calm clarity for every day.</Text>
              <Text style={[st.desc, { color: p.mu }]}>Organize tasks, time-sensitive reminders, and intentional purchases in one quiet space.</Text>
              <View style={[st.noteCard, { backgroundColor: p.s1, borderColor: p.line }]}>
                <Text style={{ color: p.tx, fontSize: 14 }}>Everything stays on this device. No account needed.</Text>
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={st.section}>
              <Text style={[st.eyebrow, { color: p.ac }]}>OVERVIEW</Text>
              <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>Three pillars, zero clutter.</Text>
              {[
                ["Tasks", "Prioritize daily work, due dates, categories, and checklists."],
                ["Reminders", "Schedule timely alerts with one-tap snooze controls."],
                ["Wishlist", "Curate planned buys and let Pick for me break ties."],
              ].map(([t, d]) => (
                <View key={t} style={[st.card, { backgroundColor: p.s1, borderColor: p.line }]}>
                  <Text style={[st.cardTitle, { color: p.ac }]}>{t}</Text>
                  <Text style={{ color: p.mu, fontSize: 14 }}>{d}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={st.section}>
              <Text style={[st.eyebrow, { color: p.ac }]}>YOUR NAME</Text>
              <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>What should we call you?</Text>
              <Text style={[st.desc, { color: p.mu }]}>Used only on this device for your personal greeting.</Text>
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
              <Text style={[st.eyebrow, { color: p.ac }]}>ADDRESS AS</Text>
              <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>How should DAYMARKED greet you?</Text>
              <Text style={[st.desc, { color: p.mu }]}>Pick a greeting style or type your own nickname.</Text>
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
                      style={[st.chip, { backgroundColor: active ? p.s2 : p.s1, borderColor: active ? p.ac : p.line }]}
                    >
                      <Text style={{ color: active ? p.ac : p.tx, fontWeight: active ? "600" : "400" }}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={st.section}>
              <Text style={[st.eyebrow, { color: p.ac }]}>ALL SET</Text>
              <Text style={[st.title, { color: p.tx, fontSize: r.compact ? 26 : 30 }]}>Ready, {(addr || nm).trim() || "friend"}.</Text>
              <Text style={[st.desc, { color: p.mu }]}>Your local workspace is ready. Take a quick 4-step tour inside or start right away.</Text>
            </View>
          ) : null}
        </View>

        <View style={st.footer}>
          {step > 0 ? (
            <Pressable
              onPress={() => { haptic.selection(); setStep((s) => s - 1); }}
              style={[st.pillGhost, { backgroundColor: p.s1, borderColor: p.line }]}
            >
              <Text style={{ color: p.tx, fontWeight: "600" }}>Previous</Text>
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
            style={[st.pillMain, { backgroundColor: p.ac }]}
          >
            <Text style={[st.pillMainText, { color: p.isDark ? "#101114" : "#FFFFFF" }]}>{step === STEPS - 1 ? "Enter App" : "Next"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 36 },
  dashes: { flex: 1, flexDirection: "row", gap: 6 },
  dash: { flex: 1, height: 4, borderRadius: 4 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  body: { flex: 1, justifyContent: "center" },
  section: { gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.8 },
  title: { fontSize: 30, fontWeight: "700", lineHeight: 36 },
  desc: { fontSize: 16, lineHeight: 23 },
  noteCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pillGhost: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 11 },
  pillMain: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11 },
  pillMainText: { color: "#FFFFFF", fontWeight: "700" },
});
