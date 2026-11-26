import { deleteKey, getEnv, getJson, isConfigured, type PushSubscriptionData, readBody, sendWebPush, setCors } from "../_lib/push";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  if (!isConfigured(env)) return res.status(503).json({ error: "Push backend is not configured" });

  try {
    const { subId } = await readBody<{ subId?: string }>(req);
    if (!subId) return res.status(400).json({ error: "Missing subId" });

    const subKey = `push:sub:${subId}`;
    const subscription = await getJson<PushSubscriptionData>(env, subKey);
    if (!subscription) return res.status(404).json({ error: "No subscription saved for this device" });

    const result = await sendWebPush(env, subscription, {
      title: "DAYMARKED Push Test",
      body: "Closed-app iOS & Web push notifications are working!",
      tag: "daymarked-push-test",
      url: "/notifications",
    });

    if (result.status === "expired") {
      await deleteKey(env, subKey);
      return res.status(410).json({ error: "Subscription expired; please re-enable notifications" });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to send test push" });
  }
}
