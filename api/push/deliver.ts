import { deleteKey, getEnv, getJson, isConfigured, type PushSubscriptionData, readBody, sendWebPush, setCors } from "../_lib/push";

type StoredReminder = {
  title: string;
  body: string;
  date: string;
  time: string;
  fireAt: number;
  cancelled?: boolean;
};

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  if (!isConfigured(env)) return res.status(503).json({ error: "Push backend is not configured" });

  try {
    const { subId, reminderId, fireAt, secret } = await readBody<{
      subId?: string;
      reminderId?: string;
      fireAt?: number;
      secret?: string;
    }>(req);

    if (env.webhookSecret && secret !== env.webhookSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!subId || !reminderId) return res.status(400).json({ error: "Missing identifiers" });

    const remKey = `push:rem:${subId}:${reminderId}`;
    const qmsgKey = `push:qmsg:${subId}:${reminderId}`;
    const subKey = `push:sub:${subId}`;

    const rem = await getJson<StoredReminder>(env, remKey);
    if (!rem || rem.cancelled || (fireAt && rem.fireAt !== fireAt)) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const subscription = await getJson<PushSubscriptionData>(env, subKey);
    if (!subscription) {
      await deleteKey(env, remKey);
      await deleteKey(env, qmsgKey);
      return res.status(200).json({ ok: true, skipped: "no_subscription" });
    }

    const result = await sendWebPush(env, subscription, {
      title: rem.title,
      body: rem.body || `Reminder (${rem.date} ${rem.time})`,
      tag: `rem_${reminderId}`,
      url: "/reminders",
    });

    if (result.status === "expired") {
      await deleteKey(env, subKey);
    }
    await deleteKey(env, remKey);
    await deleteKey(env, qmsgKey);

    return res.status(200).json({ ok: true, status: result.status });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to deliver push" });
  }
}
