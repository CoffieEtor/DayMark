import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Tabs, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../src/components/ui/icon";
import { haptic } from "../../../src/haptics";
import { usePalette } from "../../../src/lib/ui";
import { dismissDueAlert, saveReminder, useStore } from "../../../src/lib/store";

const DRAWER_W = 270;
const TAB_ITEMS: [string, string, IconName][] = [
  ["index", "Today", "home"],
  ["tasks", "Tasks", "check"],
  ["reminders", "Reminders", "bell"],
  ["wishlist", "Wishlist", "compass"],
];

const MENU_ITEMS: [string, string, IconName, string][] = [
  // ["index", "Today", "home", "/"],
  // ["tasks", "Tasks", "check", "/tasks"],
  // ["reminders", "Reminders", "bell", "/reminders"],
  // ["wishlist", "Wishlist", "compass", "/wishlist"],
  ["settings", "Settings", "settings", "/settings"],
];

export default function TabsLayout() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const p = usePalette();
  const { dueAlert, notifications } = useStore();
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const onBtnTx = p.isDark ? "#101114" : "#FFFFFF";

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

  const close = () => {
    Animated.timing(slide, {
      toValue: -DRAWER_W,
      duration: 160,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => setOpen(false));
  };

  const pushPage = (href: string) => {
    setOpen(false);
    router.push(href as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={[st.topBar, { paddingTop: insets.top + 10, backgroundColor: p.bg }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={10}
            onPress={() => { haptic.light(); setOpen(true); }}
            style={[st.menuBtn, { backgroundColor: p.s1, borderColor: p.line }]}
          >
            <Icon name="menu" size={20} color={p.tx} />
          </Pressable>
          <Text style={[st.brand, { color: p.mu }]}>DAYMARK</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          hitSlop={10}
          onPress={() => { haptic.light(); pushPage("/notifications"); }}
          style={[st.menuBtn, { backgroundColor: p.s1, borderColor: p.line }]}
        >
          <Icon name="bell" size={20} color={p.tx} />
          {unreadCount > 0 ? <View style={[st.badge, { backgroundColor: p.bad }]} /> : null}
        </Pressable>
      </View>

      {dueAlert ? (
        <View style={[st.alertBanner, { backgroundColor: p.s1, borderColor: p.ac }]}>
          <View style={{ flex: 1 }}>
            <Text style={[st.alertTitle, { color: p.tx }]}>Reminder: {dueAlert.title}</Text>
            <Text style={{ color: p.mu, fontSize: 12 }}>{dueAlert.desc || `${dueAlert.date} at ${dueAlert.time}`}</Text>
          </View>
          <Pressable onPress={() => { void saveReminder({ ...dueAlert, done: true }); dismissDueAlert(); haptic.success(); }} style={[st.alertBtn, { backgroundColor: p.ac }]}>
            <Text style={{ color: onBtnTx, fontWeight: "600", fontSize: 12 }}>Done</Text>
          </Pressable>
          <Pressable onPress={() => dismissDueAlert()} style={st.alertDismiss}>
            <Text style={{ color: p.mu, fontSize: 12 }}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: p.ac,
          tabBarInactiveTintColor: p.mu,
          tabBarStyle: { backgroundColor: p.bg, borderTopColor: p.line },
        }}
      >
        {TAB_ITEMS.map(([name, title, icon]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color, size }) => <Icon name={icon} color={color} size={size} />,
            }}
            listeners={{ tabPress: () => haptic.selection() }}
          />
        ))}
      </Tabs>

      {open ? (
        <Modal animationType="none" transparent statusBarTranslucent visible onRequestClose={close}>
          <View style={st.overlay}>
            <Pressable style={st.backdrop} onPress={close} />
            <Animated.View
              style={[
                st.drawer,
                {
                  width: DRAWER_W,
                  backgroundColor: p.bg,
                  borderRightColor: p.line,
                  paddingTop: insets.top + 8,
                  paddingBottom: insets.bottom + 20,
                  transform: [{ translateX: slide }],
                },
              ]}
            >
              <View style={st.drawerHeader}>
                <Text style={[st.drawerBrand, { color: p.tx }]}>DAYMARK</Text>
                <Text style={[st.heading, { color: p.mu }]}>Menu</Text>
              </View>
              {MENU_ITEMS.map(([name, title, icon, href]) => {
                const active = pathname === href || pathname.endsWith(`/${name}`);
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptic.selection();
                      pushPage(href);
                    }}
                    style={[st.item, active && { backgroundColor: p.s1, borderColor: p.line, borderWidth: 1 }]}
                  >
                    <Icon name={icon} size={20} color={active ? p.ac : p.mu} />
                    <Text style={{ color: active ? p.ac : p.tx, fontSize: 16, fontWeight: active ? "600" : "400" }}>{title}</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brand: {
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
    paddingHorizontal: 16,
    borderRightWidth: 1,
    gap: 6,
  },
  drawerHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  drawerBrand: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heading: {
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  alertBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertDismiss: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
