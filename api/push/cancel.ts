import { cancelQstashMessage, deleteKey, getEnv, getJson, isConfigured, readBody, setCors } from "../_lib/push";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  if (!isConfigured(env)) return res.status(503).json({ error: "Push backend is not configured" });

  try {
    const { subId, reminderId, reminderIds } = await readBody<{
      subId?: string;
      reminderId?: string;
      reminderIds?: string[];
    }>(req);

    const ids = reminderIds ?? (reminderId ? [reminderId] : []);
    if (!subId || !ids.length) return res.status(400).json({ error: "Missing subId or reminderId" });

    for (const id of ids) {
      const qmsgKey = `push:qmsg:${subId}:${id}`;
      const remKey = `push:rem:${subId}:${id}`;
      const msgId = await getJson<string>(env, qmsgKey);
      await cancelQstashMessage(env, msgId);
      await deleteKey(env, qmsgKey);
      await deleteKey(env, remKey);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to cancel push" });
  }
}
