import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./ui/icon";
import { useTheme } from "../theme/provider";

export function BrandCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Icon name="compass" size={20} color={colors.primary} />
        <Text style={[styles.eyebrow, { color: colors.primary }]}>EXPOJET</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Your Expo app is ready.</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>The StyleSheet adapter is active.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 24, borderRadius: 24, borderWidth: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: "700" },
  body: { fontSize: 16 },
});
