import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Icon } from "../../src/components/ui/icon";
import { Btn, Empty, Muted, Row, Screen, Seg, usePalette } from "../../src/lib/ui";
import {
  AppNotification,
  clearNotifications,
  deleteNotification,
  markAllNotificationsRead,
  SwipeAction,
  toggleReadNotification,
  useStore,
} from "../../src/lib/store";
import { haptic } from "../../src/haptics";

const SWIPE_THRESHOLD = 65;

function SwipeableNotifRow({
  item,
  rightSwipe,
  leftSwipe,
  onToggleRead,
  onDelete,
}: {
  item: AppNotification;
  rightSwipe: SwipeAction;
  leftSwipe: SwipeAction;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  const p = usePalette();
  const dx = useRef(new Animated.Value(0)).current;
  const rightRef = useRef(rightSwipe);
  const leftRef = useRef(leftSwipe);
  const toggleRef = useRef(onToggleRead);
  const deleteRef = useRef(onDelete);
  rightRef.current = rightSwipe;
  leftRef.current = leftSwipe;
  toggleRef.current = onToggleRead;
  deleteRef.current = onDelete;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          if (Math.abs(g.dx) <= 12 || Math.abs(g.dx) <= Math.abs(g.dy) * 1.5) return false;
          if (g.dx > 0 && rightRef.current === "none") return false;
          if (g.dx < 0 && leftRef.current === "none") return false;
          return true;
        },
        onPanResponderMove: (_, g) => {
          if (g.dx > 0 && rightRef.current === "none") return;
          if (g.dx < 0 && leftRef.current === "none") return;
          dx.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const isRight = g.dx > SWIPE_THRESHOLD;
          const isLeft = g.dx < -SWIPE_THRESHOLD;
          const action = isRight ? rightRef.current : isLeft ? leftRef.current : "none";
          if (action === "none") {
            Animated.spring(dx, { toValue: 0, useNativeDriver: Platform.OS !== "web" }).start();
            return;
          }
          if (action === "delete") {
            Animated.timing(dx, {
              toValue: isRight ? 360 : -360,
              duration: 160,
              useNativeDriver: Platform.OS !== "web",
            }).start(() => {
              haptic.medium();
              deleteRef.current();
            });
          } else {
            Animated.spring(dx, { toValue: 0, useNativeDriver: Platform.OS !== "web" }).start();
            haptic.success();
            toggleRef.current();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dx, { toValue: 0, useNativeDriver: Platform.OS !== "web" }).start();
        },
      }),
    [dx],
  );

  const readLabel = item.read ? "Mark unread" : "Mark read";
  const bgFor = (action: SwipeAction) => (action === "delete" ? p.bad : action === "read" ? p.ac : p.s2);

  return (
    <View style={st.swipeWrap}>
      <View style={st.swipeBg}>
        <View style={[st.swipeSide, { backgroundColor: bgFor(rightSwipe) }]}>
          {rightSwipe !== "none" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={rightSwipe === "delete" ? "trash" : "mail-open"} size={16} color="#FFFFFF" />
              <Text style={[st.swipeActionText, { color: "#FFFFFF" }]}>
                {rightSwipe === "delete" ? "Delete" : readLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[st.swipeSide, { alignItems: "flex-end", backgroundColor: bgFor(leftSwipe) }]}>
          {leftSwipe !== "none" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[st.swipeActionText, { color: "#FFFFFF" }]}>
                {leftSwipe === "delete" ? "Delete" : readLabel}
              </Text>
              <Icon name={leftSwipe === "delete" ? "trash" : "mail-open"} size={16} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={[
          st.rowCard,
          Platform.OS === "web" ? ({ touchAction: "pan-y" } as any) : null,
          {
            backgroundColor: item.read ? p.s2 : p.s1,
            borderColor: item.read ? p.line : p.ac,
            borderLeftWidth: item.read ? 1 : 3,
            transform: [{ translateX: dx }],
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {!item.read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.ac }} /> : null}
          <Text style={{ color: item.read ? p.mu : p.tx, fontWeight: item.read ? "500" : "700", flex: 1 }} numberOfLines={1}>{item.title}</Text>
        </View>
        {item.body ? <Muted t={item.body} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <Muted t={[item.date, item.time, item.read ? "Read" : "Unread"].filter(Boolean).join(" · ")} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => { haptic.selection(); onToggleRead(); }} hitSlop={8}>
              <Text style={{ color: p.ac, fontSize: 12, fontWeight: "600" }}>{item.read ? "Unmark read" : "Mark read"}</Text>
            </Pressable>
            <Pressable onPress={() => { haptic.medium(); onDelete(); }} hitSlop={8}>
              <Text style={{ color: p.bad, fontSize: 12, fontWeight: "600" }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { notifications, rightSwipe, leftSwipe } = useStore();
  const p = usePalette();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const list = notifications.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read : n.read));

  const actionText = (a: SwipeAction) => (a === "delete" ? "delete" : a === "read" ? "mark read" : "off");
  const hints: string[] = [];
  if (leftSwipe !== "none") hints.push(`Swipe left to ${actionText(leftSwipe)}`);
  if (rightSwipe !== "none") hints.push(`Swipe right to ${actionText(rightSwipe)}`);
  const swipeHint = hints.length ? hints.join(" · ") : "Swipe actions are turned off";

  return (
    <Screen>
      <Row>
        <Btn label="Mark all read" kind="ghost" disabled={unreadCount === 0} onPress={() => void markAllNotificationsRead()} />
        <Btn label="Clear all" kind="bad" disabled={notifications.length === 0} onPress={() => void clearNotifications()} />
      </Row>

      <Seg opts={[["all", `All (${notifications.length})`], ["unread", `Unread (${unreadCount})`], ["read", `Read (${notifications.length - unreadCount})`]]} value={filter} on={setFilter} />

      <View style={[st.tipBar, { backgroundColor: p.s1, borderColor: p.line }]}>
        <Icon name="info" size={14} color={p.mu} />
        <Text style={{ color: p.mu, fontSize: 12, flex: 1 }} numberOfLines={1}>{swipeHint}</Text>
        <Pressable hitSlop={8} onPress={() => { haptic.light(); router.push("/swipe-actions" as any); }}>
          <Text style={{ color: p.ac, fontSize: 12, fontWeight: "600" }}>Configure</Text>
        </Pressable>
      </View>

      <View style={st.inboxHeader}>
        <Text style={[st.inboxTitle, { color: p.mu }]}>INBOX</Text>
        <Text style={{ color: p.mu, fontSize: 12 }}>{list.length} {list.length === 1 ? "item" : "items"}</Text>
      </View>
      {list.length ? list.map((item) => (
        <SwipeableNotifRow
          key={item.id}
          item={item}
          rightSwipe={rightSwipe}
          leftSwipe={leftSwipe}
          onToggleRead={() => void toggleReadNotification(item.id)}
          onDelete={() => void deleteNotification(item.id)}
        />
      )) : <Empty t="No notifications" sub={filter === "unread" ? "You're all caught up." : "Due reminders and alerts will appear here."} />}
    </Screen>
  );
}

const st = StyleSheet.create({
  swipeWrap: {
    position: "relative",
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  swipeBg: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    borderRadius: 12,
  },
  swipeSide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  swipeActionText: {
    fontWeight: "700",
    fontSize: 13,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  inboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  inboxTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
});
