import { Redirect } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../src/session/provider";
export default function SignInScreen() {
  const session = useSession();
  if (session.status === "authenticated") return <Redirect href="/" />;
  return <View style={styles.container}><Text style={styles.title}>Sign in</Text><Text>No authentication adapter is enabled.</Text><Button title="Continue" onPress={session.signIn} /></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: "center", gap: 16, padding: 24 }, title: { fontSize: 30, fontWeight: "700" } });
