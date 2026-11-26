import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/icon";
import { haptic } from "../haptics";
import { ACCENTS, useStore } from "./store";

export const DARK_C = { bg: "#101114", s1: "#181A1F", s2: "#22252C", line: "#2D313A", tx: "#ECE8E1", mu: "#9699A3", ac: "#D6B56D", bad: "#E07A6D" };
export const LIGHT_C = { bg: "#F7F6F2", s1: "#FFFFFF", s2: "#EFECE4", line: "#DFDCD2", tx: "#16171B", mu: "#686B75", ac: "#B68D38", bad: "#C94A3B" };
export const C = DARK_C;

export type Palette = typeof DARK_C & { isDark: boolean };

export function usePalette(): Palette {
  const { accent, theme } = useStore();
  const sys = useColorScheme();
  const isDark = theme === "system" ? sys !== "light" : theme === "dark";
  const base = isDark ? DARK_C : LIGHT_C;
  const ac = !isDark && accent === "gold" ? "#B68D38" : (ACCENTS[accent]?.hex ?? base.ac);
  return { ...base, ac, isDark };
}

export function useAccent(): string {
  return usePalette().ac;
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const compact = width < 380;
  const wide = width >= 768;
  const pad = compact ? 14 : 18;
  return { width, height, compact, wide, pad, maxW: 720 };
}

export function Screen({ title, sub, children }: { title?: string; sub?: string; children: React.ReactNode }) {
  const p = usePalette();
  const r = useResponsive();
  const isStackSub = !title;
  const animX = useRef(new Animated.Value(Platform.OS === "web" && isStackSub ? 28 : 0)).current;
  const animO = useRef(new Animated.Value(Platform.OS === "web" && isStackSub ? 0 : 1)).current;

  useEffect(() => {
    if (Platform.OS === "web" && isStackSub) {
      Animated.parallel([
        Animated.timing(animX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(animO, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    }
  }, [animX, animO, isStackSub]);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: p.bg, opacity: animO, transform: [{ translateX: animX }] }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: p.bg }}
        contentContainerStyle={{
          paddingHorizontal: r.pad,
          paddingTop: title ? 10 : 8,
          paddingBottom: 36,
          width: "100%",
          maxWidth: r.maxW,
          alignSelf: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        {title ? <Text style={[s.h1, { color: p.tx, fontSize: r.compact ? 24 : 28 }]} accessibilityRole="header">{title}</Text> : null}
        {sub ? <Text style={{ color: p.mu, marginTop: 2 }}>{sub}</Text> : null}
        {children}
      </ScrollView>
    </Animated.View>
  );
}
export const H2 = ({ t }: { t: string }) => {
  const p = usePalette();
  return <Text style={[s.h2, { color: p.mu }]}>{t}</Text>;
};
export const Muted = ({ t, bad }: { t: string; bad?: boolean }) => {
  const p = usePalette();
  return <Text style={{ color: bad ? p.bad : p.mu, fontSize: 13 }}>{t}</Text>;
};
export const Card = ({ children, accent, done }: { children: React.ReactNode; accent?: string; done?: boolean }) => {
  const p = usePalette();
  return (
    <View style={[s.card, { backgroundColor: p.s1, borderColor: p.line }, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null, done && { opacity: 0.6 }]}>{children}</View>
  );
};
export function Btn({ label, onPress, kind = "main", disabled }: { label: string; onPress: () => void; kind?: "main" | "ghost" | "bad"; disabled?: boolean }) {
  const p = usePalette();
  const bg = kind === "main" ? p.ac : kind === "ghost" ? p.s2 : "transparent";
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { haptic.light(); onPress(); }}
      style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, kind === "bad" && { borderWidth: 1, borderColor: p.line }]}>
      <Text style={{ color: kind === "main" ? (p.isDark ? "#101114" : "#FFFFFF") : kind === "bad" ? p.bad : p.tx, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
export const Row = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>{children}</View>;
export function Seg<T extends string>({ opts, value, on }: { opts: [T, string][]; value: T; on: (v: T) => void }) {
  const p = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
      {opts.map(([v, l]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: v === value }} onPress={() => { haptic.selection(); on(v); }}
          style={[s.chip, { backgroundColor: p.s1, borderColor: v === value ? p.ac : p.line }]}><Text style={{ color: v === value ? p.ac : p.mu }}>{l}</Text></Pressable>
      ))}
    </ScrollView>
  );
}
export const Empty = ({ t, sub }: { t: string; sub: string }) => {
  const p = usePalette();
  return <View style={{ alignItems: "center", padding: 32 }}><Text style={{ color: p.tx, fontWeight: "600" }}>{t}</Text><Text style={{ color: p.mu, textAlign: "center", marginTop: 4 }}>{sub}</Text></View>;
};
export function Check({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} hitSlop={10} onPress={() => { haptic.success(); onPress(); }}
      style={[s.check, { borderColor: on ? p.ac : p.mu }, on && { backgroundColor: p.ac }]}>{on ? <Text style={{ color: p.isDark ? "#101114" : "#FFFFFF", fontSize: 14, fontWeight: "700" }}>✓</Text> : null}</Pressable>
  );
}
export const confirmDelete = (label: string, fn: () => void) => Alert.alert("Delete?", `"${label}" will be removed.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: fn }]);
export function CardMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const slideY = useRef(new Animated.Value(220)).current;
  const close = () => {
    Animated.timing(slideY, { toValue: 220, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start(() => {
      setOpen(false);
      setConfirming(false);
    });
  };
  useEffect(() => {
    if (open) {
      slideY.setValue(220);
      Animated.timing(slideY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
    }
  }, [open, slideY]);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${label}`}
        hitSlop={10}
        onPress={() => { haptic.light(); setConfirming(false); setOpen(true); }}
        style={s.menuBtn}
      >
        <Icon name="menu" size={18} color={p.mu} />
      </Pressable>
      {open ? (
        <Modal animationType="fade" transparent statusBarTranslucent visible onRequestClose={close}>
          <Pressable style={s.backdrop} onPress={close}>
            <Animated.View
              style={[
                s.sheet,
                {
                  backgroundColor: p.bg,
                  borderColor: p.line,
                  paddingBottom: Math.max(insets.bottom, 16) + 12,
                  maxWidth: r.maxW,
                  width: "100%",
                  alignSelf: "center",
                  transform: [{ translateY: slideY }],
                },
              ]}
            >
              <Pressable onPress={() => {}}>
                <Text style={[s.h2, { marginTop: 0, color: p.tx }]} numberOfLines={1}>{label}</Text>
                {confirming ? (
                  <>
                    <Text style={{ color: p.mu, marginBottom: 14 }}>"{label}" will be removed.</Text>
                    <Row>
                      <Btn label="Delete" kind="bad" onPress={() => { close(); onDelete(); }} />
                      <Btn label="Cancel" kind="ghost" onPress={() => setConfirming(false)} />
                    </Row>
                  </>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Btn label="Edit" kind="ghost" onPress={() => { setOpen(false); setConfirming(false); onEdit(); }} />
                    <Btn label="Delete" kind="bad" onPress={() => setConfirming(true)} />
                    <Btn label="Cancel" kind="ghost" onPress={close} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
export const Input = (props: React.ComponentProps<typeof TextInput>) => {
  const p = usePalette();
  return <TextInput placeholderTextColor={p.mu} {...props} style={[s.input, { backgroundColor: p.s2, borderColor: p.line, color: p.tx }, props.style]} />;
};

export type Field = {
  k: string;
  label: string;
  multiline?: boolean;
  numeric?: boolean;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  optionLabels?: Record<string, string>;
  presets?: { label: string; value: string }[];
};
export function FormSheet({
  title,
  fields,
  initial,
  onSave,
  onClose,
  extra,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  onSave: (v: Record<string, string>) => string | void;
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  const [v, setV] = useState<Record<string, string>>(initial);
  const [err, setErr] = useState("");
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const slideY = useRef(new Animated.Value(320)).current;
  useEffect(() => {
    Animated.timing(slideY, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
  }, [slideY]);
  const submit = () => {
    setErr("");
    for (const f of fields) if (f.required && !v[f.k]?.trim()) return setErr(`${f.label} is required.`);
    const msg = onSave(v);
    if (msg) setErr(msg);
  };
  return (
    <Modal animationType="fade" transparent statusBarTranslucent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.6)" }}>
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: p.bg,
              borderColor: p.line,
              paddingBottom: Math.max(insets.bottom, 16) + 14,
              maxWidth: r.maxW,
              width: "100%",
              alignSelf: "center",
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[s.h1, { color: p.tx, fontSize: r.compact ? 22 : 26 }]}>{title}</Text>
            {fields.map((f) => (
              <View key={f.k}>
                <Text style={[s.label, { color: p.mu }]}>{f.label}{f.required ? " *" : ""}</Text>
                {f.options ? (
                  <Seg opts={f.options.map((o) => [o, f.optionLabels?.[o] ?? o] as [string, string])} value={v[f.k]} on={(x) => setV({ ...v, [f.k]: x })} />
                ) : (
                  <>
                    <Input
                      value={v[f.k] ?? ""}
                      multiline={f.multiline}
                      keyboardType={f.numeric ? "decimal-pad" : "default"}
                      placeholder={f.placeholder}
                      autoCapitalize={f.k === "url" ? "none" : "sentences"}
                      onChangeText={(x) => setV({ ...v, [f.k]: x })}
                    />
                    {f.presets?.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {f.presets.map((pr) => {
                          const active = (v[f.k] ?? "") === pr.value;
                          return (
                            <Pressable
                              key={pr.label}
                              onPress={() => { haptic.selection(); setV({ ...v, [f.k]: pr.value }); }}
                              style={[s.chip, { backgroundColor: p.s1, paddingVertical: 5, paddingHorizontal: 11, borderColor: active ? p.ac : p.line }]}
                            >
                              <Text style={{ color: active ? p.ac : p.mu, fontSize: 12 }}>{pr.label}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                  </>
                )}
              </View>
            ))}
            {extra}
            {err ? <Text style={{ color: p.bad, marginTop: 10 }} accessibilityRole="alert">{err}</Text> : null}
            <Row><Btn label="Save" onPress={submit} /><Btn label="Cancel" kind="ghost" onPress={onClose} /></Row>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "600" }, h2: { fontSize: 15, fontWeight: "600", marginTop: 24, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  btn: { borderRadius: 10, paddingHorizontal: 16, minHeight: 44, alignItems: "center", justifyContent: "center" },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 6 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  label: { fontSize: 13, marginTop: 12, marginBottom: 4 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, paddingBottom: 30, maxHeight: "90%", borderWidth: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.6)" },
  menuBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
