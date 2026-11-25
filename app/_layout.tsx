import "../src/style-entry";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { init } from "../src/lib/store";

export default function RootLayout() {
  useEffect(() => { init(); }, []);
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#101114" } }} />
    </>
  );
}
