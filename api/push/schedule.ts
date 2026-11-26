import { cancelQstashMessage, getEnv, getJson, getPublicOrigin, isConfigured, readBody, setCors, setJson } from "../_lib/push";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  if (!isConfigured(env)) return res.status(503).json({ error: "Push backend is not configured" });

  try {
    const { subId, reminderId, title, body, date, time, fireAtMs } = await readBody<{
      subId?: string;
      reminderId?: string;
      title?: string;
      body?: string;
      date?: string;
      time?: string;
      fireAtMs?: number;
    }>(req);

    if (!subId || !reminderId || !title || !Number.isFinite(fireAtMs)) {
      return res.status(400).json({ error: "Missing reminder scheduling fields" });
    }

    const qmsgKey = `push:qmsg:${subId}:${reminderId}`;
    const remKey = `push:rem:${subId}:${reminderId}`;

    const prevMsgId = await getJson<string>(env, qmsgKey);
    await cancelQstashMessage(env, prevMsgId);

    const fireAt = Number(fireAtMs);
    await setJson(env, remKey, {
      title,
      body: body || "Reminder",
      date: date || "",
      time: time || "",
      fireAt,
      cancelled: false,
    });

    const deliverUrl = `${getPublicOrigin(req)}/api/push/deliver`;
    const notBeforeSec = Math.max(Math.floor(Date.now() / 1000) + 1, Math.floor(fireAt / 1000));
    const qRes = await fetch(`https://qstash.upstash.io/v2/publish/${deliverUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.qstashToken}`,
        "Content-Type": "application/json",
        "Upstash-Not-Before": String(notBeforeSec),
        "Upstash-Retries": "2",
      },
      body: JSON.stringify({
        subId,
        reminderId,
        fireAt,
        secret: env.webhookSecret,
      }),
    });

    if (!qRes.ok) {
      const txt = await qRes.text().catch(() => "");
      return res.status(502).json({ error: `QStash publish failed (${qRes.status}): ${txt}` });
    }

    const qData = (await qRes.json()) as { messageId?: string };
    if (qData.messageId) {
      await setJson(env, qmsgKey, qData.messageId);
    }

    return res.status(200).json({ ok: true, messageId: qData.messageId ?? null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to schedule push" });
  }
}
