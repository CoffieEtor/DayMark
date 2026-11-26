import webPush, { type PushSubscription } from "web-push";

export type PushEnv = {
  publicKey: string;
  privateKey: string;
  subject: string;
  redisUrl: string;
  redisToken: string;
  qstashToken: string;
  webhookSecret: string;
};

export function getEnv(): PushEnv {
  return {
    publicKey: (process.env.VAPID_PUBLIC_KEY ?? "").trim(),
    privateKey: (process.env.VAPID_PRIVATE_KEY ?? "").trim(),
    subject: (process.env.VAPID_SUBJECT ?? "mailto:admin@daymarked.app").trim(),
    redisUrl: (process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/+$/, ""),
    redisToken: (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
    qstashToken: (process.env.QSTASH_TOKEN ?? "").trim(),
    webhookSecret: (process.env.PUSH_WEBHOOK_SECRET ?? "").trim(),
  };
}

export function isConfigured(env: PushEnv): boolean {
  return Boolean(env.publicKey && env.privateKey && env.redisUrl && env.redisToken && env.qstashToken);
}

export async function redisCmd<T = unknown>(env: PushEnv, args: unknown[]): Promise<T> {
  const res = await fetch(env.redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upstash Redis error (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as { result: T; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function getJson<T>(env: PushEnv, key: string): Promise<T | null> {
  const raw = await redisCmd<string | null>(env, ["GET", key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(env: PushEnv, key: string, value: unknown, ttlSec = 60 * 60 * 24 * 90): Promise<void> {
  await redisCmd(env, ["SET", key, JSON.stringify(value), "EX", String(ttlSec)]);
}

export async function deleteKey(env: PushEnv, key: string): Promise<void> {
  await redisCmd(env, ["DEL", key]);
}

export async function cancelQstashMessage(env: PushEnv, messageId: string | null): Promise<void> {
  if (!messageId || !env.qstashToken) return;
  await fetch(`https://qstash.upstash.io/v2/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.qstashToken}` },
  }).catch(() => {});
}

export async function sendWebPush(
  env: PushEnv,
  subscription: PushSubscription,
  payload: { title: string; body: string; tag?: string; url?: string },
): Promise<{ status: "sent" | "expired" }> {
  webPush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return { status: "sent" };
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      return { status: "expired" };
    }
    throw err;
  }
}

export function setCors(res: any): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export async function readBody<T = Record<string, any>>(req: any): Promise<T> {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}") as T;
  const decoder = new TextDecoder();
  let raw = "";
  for await (const chunk of req) {
    raw += typeof chunk === "string" ? chunk : decoder.decode(chunk as Uint8Array, { stream: true });
  }
  raw += decoder.decode();
  return (raw ? JSON.parse(raw) : {}) as T;
}

export function getPublicOrigin(req: any): string {
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  const proto = req.headers?.["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}
