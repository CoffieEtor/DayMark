import "../src/style-entry";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { init } from "../src/lib/store";
import { usePalette } from "../src/lib/ui";

export default function RootLayout() {
  const p = usePalette();
  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.style.backgroundColor = p.bg;
    document.body.style.backgroundColor = p.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.bg);
  }, [p.bg]);

  return (
    <>
      <StatusBar style={p.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: p.bg } }} />
    </>
  );
}
