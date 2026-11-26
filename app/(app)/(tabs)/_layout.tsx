import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../src/components/ui/icon";
import { haptic } from "../../../src/haptics";
import { usePalette, useResponsive } from "../../../src/lib/ui";
import { dismissDueAlert, saveReminder, useStore } from "../../../src/lib/store";

const DRAWER_W = 270;
const TAB_ITEMS: [string, string, IconName][] = [
  ["index", "Today", "home"],
  ["tasks", "Tasks", "check"],
  ["reminders", "Reminders", "bell"],
  ["wishlist", "Wishlist", "compass"],
];

// const MENU_ITEMS: [string, string, IconName, string][] = [
//   ["index", "Today", "home", "/"],
//   ["tasks", "Tasks", "check", "/tasks"],
//   ["reminders", "Reminders", "bell", "/reminders"],
//   ["wishlist", "Wishlist", "compass", "/wishlist"],
// ];

export default function TabsLayout() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const r = useResponsive();
  const { dueAlert, notifications, name, addressAs } = useStore();
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const onBtnTx = p.isDark ? "#101114" : "#FFFFFF";
  const who = (addressAs || name).trim();

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
    if (Platform.OS === "web" && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => router.push(href as any));
    } else {
      router.push(href as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={[st.topBar, { paddingTop: Math.max(insets.top, 4) + 8, paddingHorizontal: r.pad, maxWidth: r.maxW, width: "100%", alignSelf: "center", backgroundColor: p.bg }]}>
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
          <Text style={[st.brand, { color: p.mu }]}>DAYMARKED</Text>
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
        <View style={[st.alertBanner, { backgroundColor: p.s1, borderColor: p.ac, marginHorizontal: r.pad, maxWidth: r.maxW - r.pad * 2, width: "100%", alignSelf: "center" }]}>
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
          animation: "shift",
          tabBarActiveTintColor: p.ac,
          tabBarInactiveTintColor: p.mu,
          tabBarStyle: {
            backgroundColor: p.bg,
            borderTopColor: p.line,
            height: 56 + Math.max(insets.bottom, 6),
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
          },
          tabBarItemStyle: { maxWidth: 180 },
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
                  width: Math.min(DRAWER_W, Math.round(r.width * 0.78)),
                  backgroundColor: p.bg,
                  borderRightColor: p.line,
                  paddingTop: Platform.OS === "web" ? ("calc(env(safe-area-inset-top, 0px) + 14px)" as any) : Math.max(insets.top, 12) + 8,
                  paddingBottom: Platform.OS === "web" ? ("calc(env(safe-area-inset-bottom, 0px) + 20px)" as any) : Math.max(insets.bottom, 20),
                  transform: [{ translateX: slide }],
                },
              ]}
            >
              <View style={[st.drawerHeader, { borderBottomColor: p.line }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={[st.userBadge, { backgroundColor: p.s1, borderColor: p.line }]}>
                    <Icon name="user" size={18} color={p.ac} />
                  </View>
                  {who ? (
                    <Text style={{ color: p.tx, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                      {who}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open settings"
                  hitSlop={10}
                  onPress={() => {
                    haptic.selection();
                    pushPage("/settings");
                  }}
                  style={[st.menuBtn, { backgroundColor: p.s1, borderColor: p.line }]}
                >
                  <Icon name="settings" size={19} color={p.tx} />
                </Pressable>
              </View>
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
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,.6)",
  },
  drawer: {
    zIndex: 2,
    height: "100%",
    paddingHorizontal: 16,
    borderRightWidth: 1,
    gap: 6,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  userBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
