import { getEnv, isConfigured, setCors } from "../_lib/push";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const env = getEnv();
  return res.status(200).json({
    configured: isConfigured(env),
    publicKey: env.publicKey || null,
  });
}
