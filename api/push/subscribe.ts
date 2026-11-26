import { getEnv, isConfigured, readBody, setCors, setJson } from "../_lib/push";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  if (!isConfigured(env)) return res.status(503).json({ error: "Push backend is not configured" });

  try {
    const { subId, subscription } = await readBody<{ subId?: string; subscription?: any }>(req);
    if (!subId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    await setJson(env, `push:sub:${subId}`, subscription);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to save subscription" });
  }
}
