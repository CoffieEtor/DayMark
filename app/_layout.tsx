import "../src/style-entry";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { init } from "../src/lib/store";
import { usePalette } from "../src/lib/ui";

export default function RootLayout() {
  const p = usePalette();
  useEffect(() => { init(); }, []);
  return (
    <>
      <StatusBar style={p.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />
    </>
  );
}
