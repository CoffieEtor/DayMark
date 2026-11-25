import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Tabs, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../src/components/ui/icon";
import { haptic } from "../../src/haptics";
import { C } from "../../src/lib/ui";
import { dismissDueAlert, saveReminder, useStore } from "../../src/lib/store";

const DRAWER_W = 270;
const T: [string, string, IconName, string][] = [
  ["index", "Today", "home", "/"],
  ["tasks", "Tasks", "check", "/tasks"],
  ["reminders", "Reminders", "bell", "/reminders"],
  ["wishlist", "Wishlist", "compass", "/wishlist"],
  ["settings", "Settings", "settings", "/settings"],
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { dueAlert } = useStore();
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;

  useEffect(() => {
    if (open) {
      slide.setValue(-DRAWER_W);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [open, slide]);

  const close = (after?: () => void) => {
    Animated.timing(slide, {
      toValue: -DRAWER_W,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      setOpen(false);
      after?.();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          hitSlop={10}
          onPress={() => { haptic.light(); setOpen(true); }}
          style={st.menuBtn}
        >
          <Icon name="menu" size={20} color={C.tx} />
        </Pressable>
        <Text style={st.brand}>DAYMARK</Text>
      </View>

      {dueAlert ? (
        <View style={st.alertBanner}>
          <View style={{ flex: 1 }}>
            <Text style={st.alertTitle}>Reminder: {dueAlert.title}</Text>
            <Text style={st.alertSub}>{dueAlert.desc || `${dueAlert.date} at ${dueAlert.time}`}</Text>
          </View>
          <Pressable onPress={() => { saveReminder({ ...dueAlert, done: true }); dismissDueAlert(); haptic.success(); }} style={st.alertBtn}>
            <Text style={{ color: C.bg, fontWeight: "600", fontSize: 12 }}>Done</Text>
          </Pressable>
          <Pressable onPress={() => dismissDueAlert()} style={st.alertDismiss}>
            <Text style={{ color: C.mu, fontSize: 12 }}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
        {T.map(([name, title]) => (
          <Tabs.Screen key={name} name={name} options={{ title }} />
        ))}
      </Tabs>

      {open ? (
        <Modal animationType="none" transparent statusBarTranslucent visible onRequestClose={() => close()}>
          <View style={st.overlay}>
            <Pressable style={st.backdrop} onPress={() => close()} />
            <Animated.View
              style={[
                st.drawer,
                {
                  width: DRAWER_W,
                  paddingTop: insets.top + 8,
                  paddingBottom: insets.bottom + 20,
                  transform: [{ translateX: slide }],
                },
              ]}
            >
              <View style={st.drawerHeader}>
                <Text style={st.drawerBrand}>DAYMARK</Text>
                <Text style={st.heading}>Menu</Text>
              </View>
              {T.map(([name, title, icon, href]) => {
                const active = pathname === href || (name === "index" && (pathname === "/" || pathname === "/(app)"));
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptic.selection();
                      close(() => router.navigate(href as any));
                    }}
                    style={[st.item, active && st.itemActive]}
                  >
                    <Icon name={icon} size={20} color={active ? C.ac : C.mu} />
                    <Text style={[st.itemText, active && { color: C.ac, fontWeight: "600" }]}>{title}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 6,
    backgroundColor: C.bg,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.s1,
    borderColor: C.line,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: C.mu,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,.6)",
  },
  drawer: {
    height: "100%",
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    borderRightColor: C.line,
    borderRightWidth: 1,
    gap: 6,
  },
  drawerHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  drawerBrand: {
    color: C.tx,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heading: {
    color: C.mu,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: C.s1,
    borderColor: C.line,
    borderWidth: 1,
  },
  itemText: {
    color: C.tx,
    fontSize: 16,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.s1,
    borderColor: C.ac,
    borderWidth: 1,
  },
  alertTitle: {
    color: C.tx,
    fontWeight: "600",
    fontSize: 14,
  },
  alertSub: {
    color: C.mu,
    fontSize: 12,
  },
  alertBtn: {
    backgroundColor: C.ac,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertDismiss: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
