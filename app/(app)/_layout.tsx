import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "../../src/haptics";
import { usePalette } from "../../src/lib/ui";
import { setTourStep, useStore } from "../../src/lib/store";

const TOUR_STEPS: { title: string; body: string; href: string }[] = [
  { title: "1. Tasks", body: "Capture tasks with priorities, quick due presets, categories, and checklist subtasks.", href: "/tasks" },
  { title: "2. Reminders", body: "Schedule alerts with Morning/Afternoon/Evening presets and one-tap snooze.", href: "/reminders" },
  { title: "3. Wishlist & Picker", body: "Track planned purchases and let Pick for me choose within your budget.", href: "/wishlist" },
  { title: "4. Settings", body: "Customize dark/light mode, accent colors, swipe actions, currency, and backups.", href: "/settings" },
];

export default function Layout() {
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { tourStep } = useStore();
  const onBtnTx = p.isDark ? "#101114" : "#FFFFFF";

  const tour = tourStep !== null ? TOUR_STEPS[tourStep] : null;
  const advanceTour = (next: number | null) => {
    haptic.selection();
    if (next === null || next >= TOUR_STEPS.length) {
      setTourStep(null);
      router.navigate("/" as any);
      return;
    }
    setTourStep(next);
    if (TOUR_STEPS[next].href === "/settings") {
      router.push("/settings" as any);
    } else {
      router.navigate(TOUR_STEPS[next].href as any);
    }
  };

  const stackHeader = {
    headerShown: true,
    headerStyle: { backgroundColor: p.bg },
    headerTintColor: p.tx,
    headerTitleStyle: { color: p.tx, fontWeight: "700" as const },
    headerShadowVisible: false,
    animation: "slide_from_right" as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
          contentStyle: { backgroundColor: p.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ ...stackHeader, title: "Settings" }} />
        <Stack.Screen name="notifications" options={{ ...stackHeader, title: "Notifications" }} />
        <Stack.Screen name="swipe-actions" options={{ ...stackHeader, title: "Swipe actions" }} />
      </Stack>

      {tour ? (
        <View style={[st.tourCard, { bottom: insets.bottom + 72, backgroundColor: p.s1, borderColor: p.ac }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[st.tourTitle, { color: p.ac }]}>{tour.title}</Text>
            <Pressable onPress={() => advanceTour(null)} hitSlop={8}>
              <Text style={{ color: p.mu, fontSize: 12, fontWeight: "600" }}>Skip</Text>
            </Pressable>
          </View>
          <Text style={[st.tourBody, { color: p.tx }]}>{tour.body}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <Text style={{ color: p.mu, fontSize: 12 }}>{(tourStep ?? 0) + 1} / {TOUR_STEPS.length}</Text>
            <Pressable
              onPress={() => advanceTour((tourStep ?? 0) + 1)}
              style={[st.tourBtn, { backgroundColor: p.ac }]}
            >
              <Text style={{ color: onBtnTx, fontWeight: "700", fontSize: 13 }}>
                {(tourStep ?? 0) === TOUR_STEPS.length - 1 ? "Done" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  tourCard: {
    position: "absolute",
    left: 18,
    right: 18,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    zIndex: 30,
  },
  tourTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  tourBody: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  tourBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
