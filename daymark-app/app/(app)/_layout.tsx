import { Tabs } from "expo-router";
import { Icon, type IconName } from "../../src/components/ui/icon";
import { haptic } from "../../src/haptics";
import { C } from "../../src/lib/ui";

const T: [string, string, IconName][] = [["index", "Today", "home"], ["tasks", "Tasks", "check"], ["reminders", "Reminders", "bell"], ["wishlist", "Wishlist", "compass"], ["settings", "Settings", "settings"]];
export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: C.ac, tabBarInactiveTintColor: C.mu, tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line } }}>
      {T.map(([name, title, icon]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <Icon name={icon} color={color} size={size} /> }} listeners={{ tabPress: () => haptic.selection() }} />
      ))}
    </Tabs>
  );
}
