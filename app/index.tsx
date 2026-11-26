import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { usePalette } from "../src/lib/ui";
import { useStore } from "../src/lib/store";

export default function Index() {
  const { ready, onboarded, name, addressAs } = useStore();
  const p = usePalette();

  if (!ready) {
    const who = (addressAs || name).trim();
    return (
      <View style={[st.wrap, { backgroundColor: p.bg }]}>
        <Text style={[st.brand, { color: p.ac }]}>DAYMARKED</Text>
        <Text style={[st.tagline, { color: p.mu }]}>{who ? `Welcome back, ${who}` : "Plan your day. Own your time."}</Text>
      </View>
    );
  }

  return <Redirect href={onboarded ? "/(app)" : "/(onboarding)"} />;
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  brand: { fontSize: 32, fontWeight: "700", letterSpacing: 4 },
  tagline: { fontSize: 15, marginTop: 12, textAlign: "center" },
});
