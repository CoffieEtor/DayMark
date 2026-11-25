import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../src/components/ui/icon";
import { Muted, Screen, usePalette } from "../../src/lib/ui";
import { setLeftSwipe, setRightSwipe, SwipeAction, useStore } from "../../src/lib/store";
import { haptic } from "../../src/haptics";

const ACTION_LABEL: Record<SwipeAction, string> = {
  delete: "Delete",
  read: "Mark as read/unread",
  none: "None",
};

const OPTIONS: SwipeAction[] = ["delete", "read", "none"];

function SwipePreview({ side, action }: { side: "right" | "left"; action: SwipeAction }) {
  const p = usePalette();
  const actionBg = action === "delete" ? p.bad : action === "read" ? p.ac : p.s2;
  const iconName = action === "delete" ? "trash" : "mail-open";

  const actionBox = (
    <View style={[st.previewAction, { backgroundColor: actionBg }]}>
      {action !== "none" ? (
        <Icon name={iconName} size={22} color="#FFFFFF" />
      ) : (
        <Text style={{ color: p.mu, fontSize: 11, fontWeight: "600" }}>Off</Text>
      )}
    </View>
  );

  const skeletonCard = (
    <View style={[st.previewBody, { backgroundColor: p.s1 }]}>
      <View style={[st.avatar, { backgroundColor: p.s2 }]} />
      <View style={{ flex: 1, gap: 7 }}>
        <View style={[st.bar, { width: "68%", backgroundColor: p.line }]} />
        <View style={[st.bar, { width: "92%", backgroundColor: p.s2 }]} />
        <View style={[st.bar, { width: "54%", backgroundColor: p.s2 }]} />
      </View>
    </View>
  );

  return (
    <View style={[st.previewWrap, { borderColor: p.line, backgroundColor: p.s1 }]}>
      {side === "right" ? (
        <>
          {actionBox}
          {skeletonCard}
        </>
      ) : (
        <>
          {skeletonCard}
          {actionBox}
        </>
      )}
    </View>
  );
}

export default function SwipeActionsScreen() {
  const { rightSwipe, leftSwipe } = useStore();
  const p = usePalette();
  const [editing, setEditing] = useState<"right" | "left" | null>(null);

  const currentVal = editing === "right" ? rightSwipe : leftSwipe;
  const selectOption = (val: SwipeAction) => {
    haptic.selection();
    if (editing === "right") void setRightSwipe(val);
    else if (editing === "left") void setLeftSwipe(val);
    setEditing(null);
  };

  return (
    <Screen>
      <View style={[st.section, { borderBottomColor: p.line }]}>
        <View style={st.headerRow}>
          <View>
            <Text style={[st.sideTitle, { color: p.tx }]}>Right swipe</Text>
            <Muted t={ACTION_LABEL[rightSwipe]} />
          </View>
          <Pressable hitSlop={10} onPress={() => { haptic.light(); setEditing("right"); }}>
            <Text style={[st.changeBtn, { color: p.ac }]}>CHANGE</Text>
          </Pressable>
        </View>
        <SwipePreview side="right" action={rightSwipe} />
      </View>

      <View style={st.section}>
        <View style={st.headerRow}>
          <View>
            <Text style={[st.sideTitle, { color: p.tx }]}>Left swipe</Text>
            <Muted t={ACTION_LABEL[leftSwipe]} />
          </View>
          <Pressable hitSlop={10} onPress={() => { haptic.light(); setEditing("left"); }}>
            <Text style={[st.changeBtn, { color: p.ac }]}>CHANGE</Text>
          </Pressable>
        </View>
        <SwipePreview side="left" action={leftSwipe} />
      </View>

      {editing ? (
        <Modal animationType="fade" transparent visible onRequestClose={() => setEditing(null)}>
          <Pressable style={st.backdrop} onPress={() => setEditing(null)}>
            <Pressable style={[st.dialog, { backgroundColor: p.s1, borderColor: p.line }]} onPress={() => {}}>
              <Text style={[st.dialogTitle, { color: p.tx }]}>
                {editing === "right" ? "Use right swipe for" : "Use left swipe for"}
              </Text>
              <View style={{ marginTop: 12, gap: 4 }}>
                {OPTIONS.map((opt) => {
                  const selected = currentVal === opt;
                  return (
                    <Pressable
                      key={opt}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => selectOption(opt)}
                      style={st.radioRow}
                    >
                      <View style={[st.radioOuter, { borderColor: selected ? p.ac : p.mu }]}>
                        {selected ? <View style={[st.radioInner, { backgroundColor: p.ac }]} /> : null}
                      </View>
                      <Text style={{ color: p.tx, fontSize: 16 }}>{ACTION_LABEL[opt]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ alignItems: "flex-end", marginTop: 14 }}>
                <Pressable hitSlop={10} onPress={() => setEditing(null)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: p.ac, fontWeight: "600", fontSize: 14 }}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  section: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  changeBtn: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  previewWrap: {
    flexDirection: "row",
    height: 84,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewAction: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
