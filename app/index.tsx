import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { C, useAccent } from "../src/lib/ui";
import { useStore } from "../src/lib/store";

export default function Index() {
  const { ready, onboarded, name, addressAs } = useStore();
  const ac = useAccent();

  if (!ready) {
    const who = (addressAs || name).trim();
    return (
      <View style={st.wrap}>
        <Text style={[st.brand, { color: ac }]}>DAYMARK</Text>
        <Text style={st.tagline}>{who ? `Welcome back, ${who}` : "Plan your day. Own your time."}</Text>
      </View>
    );
  }

  return <Redirect href={onboarded ? "/(app)" : "/(onboarding)"} />;
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  brand: { fontSize: 32, fontWeight: "700", letterSpacing: 4 },
  tagline: { color: C.mu, fontSize: 15, marginTop: 12, textAlign: "center" },
});
