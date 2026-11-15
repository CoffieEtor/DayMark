import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "../haptics";

export const C = { bg: "#141414", s1: "#1d1d1c", s2: "#272624", line: "#34322f", tx: "#ece8e1", mu: "#9a958c", ac: "#d6b98c", bad: "#d9806f" };

export function Screen({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const i = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: i.top + 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h1} accessibilityRole="header">{title}</Text>
      {sub ? <Text style={s.mu}>{sub}</Text> : null}
      {children}
    </ScrollView>
  );
}
export const H2 = ({ t }: { t: string }) => <Text style={s.h2}>{t}</Text>;
export const Muted = ({ t, bad }: { t: string; bad?: boolean }) => <Text style={[s.mu, { fontSize: 13 }, bad && { color: C.bad }]}>{t}</Text>;
export const Card = ({ children, accent, done }: { children: React.ReactNode; accent?: string; done?: boolean }) => (
  <View style={[s.card, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null, done && { opacity: 0.6 }]}>{children}</View>
);
export function Btn({ label, onPress, kind = "main", disabled }: { label: string; onPress: () => void; kind?: "main" | "ghost" | "bad"; disabled?: boolean }) {
  const bg = kind === "main" ? C.ac : kind === "ghost" ? C.s2 : "transparent";
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { haptic.light(); onPress(); }}
      style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, kind === "bad" && { borderWidth: 1, borderColor: C.line }]}>
      <Text style={{ color: kind === "main" ? "#1a1612" : kind === "bad" ? C.bad : C.tx, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
export const Row = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>{children}</View>;
export function Seg<T extends string>({ opts, value, on }: { opts: [T, string][]; value: T; on: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
      {opts.map(([v, l]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: v === value }} onPress={() => { haptic.selection(); on(v); }}
          style={[s.chip, v === value && { borderColor: C.ac }]}><Text style={{ color: v === value ? C.ac : C.mu }}>{l}</Text></Pressable>
      ))}
    </ScrollView>
  );
}
export const Empty = ({ t, sub }: { t: string; sub: string }) => (
  <View style={{ alignItems: "center", padding: 32 }}><Text style={{ color: C.tx, fontWeight: "600" }}>{t}</Text><Text style={s.mu}>{sub}</Text></View>
);
export const Check = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} hitSlop={10} onPress={() => { haptic.success(); onPress(); }}
    style={[s.check, on && { backgroundColor: C.ac, borderColor: C.ac }]}>{on ? <Text style={{ color: C.bg, fontSize: 14 }}>✓</Text> : null}</Pressable>
);
export const confirmDelete = (label: string, fn: () => void) => Alert.alert("Delete?", `"${label}" will be removed.`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: fn }]);
export const Input = (p: React.ComponentProps<typeof TextInput>) => <TextInput placeholderTextColor={C.mu} {...p} style={[s.input, p.style]} />;

export type Field = { k: string; label: string; multiline?: boolean; numeric?: boolean; placeholder?: string; required?: boolean; options?: string[] };
export function FormSheet({ title, fields, initial, onSave, onClose, validate }: { title: string; fields: Field[]; initial: Record<string, string>; onSave: (v: Record<string, string>) => void; onClose: () => void; validate?: (v: Record<string, string>) => string }) {
  const [v, setV] = useState<Record<string, string>>(initial);
  const [err, setErr] = useState("");
  const submit = () => {
    for (const f of fields) if (f.required && !v[f.k]?.trim()) return setErr(`${f.label} is required.`);
    const bad = validate?.(v);
    if (bad) return setErr(bad);
    setErr("");
    onSave(v);
  };
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.6)" }}>
        <View style={[s.sheet]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.h1}>{title}</Text>
            {fields.map((f) => (
              <View key={f.k}>
                <Text style={s.label}>{f.label}{f.required ? " *" : ""}</Text>
                {f.options ? <Seg opts={f.options.map((o) => [o, o] as [string, string])} value={v[f.k]} on={(x) => setV({ ...v, [f.k]: x })} />
                  : <Input value={v[f.k] ?? ""} multiline={f.multiline} keyboardType={f.numeric ? "decimal-pad" : "default"} placeholder={f.placeholder} autoCapitalize={f.k === "url" ? "none" : "sentences"} onChangeText={(x) => setV({ ...v, [f.k]: x })} />}
              </View>
            ))}
            {err ? <Text style={{ color: C.bad, marginTop: 10 }} accessibilityRole="alert">{err}</Text> : null}
            <Row><Btn label="Save" onPress={submit} /><Btn label="Cancel" kind="ghost" onPress={onClose} /></Row>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  h1: { color: C.tx, fontSize: 28, fontWeight: "600" }, h2: { color: C.mu, fontSize: 15, fontWeight: "600", marginTop: 24, marginBottom: 10 }, mu: { color: C.mu },
  card: { backgroundColor: C.s1, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  btn: { borderRadius: 10, paddingHorizontal: 16, minHeight: 44, alignItems: "center", justifyContent: "center" },
  chip: { borderColor: C.line, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, backgroundColor: C.s1 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.mu, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: C.s2, borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, color: C.tx, fontSize: 16 },
  label: { color: C.mu, fontSize: 13, marginTop: 12, marginBottom: 4 },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, paddingBottom: 30, maxHeight: "90%", borderColor: C.line, borderWidth: 1 },
});
