import { useEffect, useState } from "react";
import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

export function initPwaListeners() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    promptListeners.forEach((fn) => fn());
  });
}

export function isWebStandalone(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
}

export function isIOSWeb(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

export function getRootTopPaddingPx(): number {
  if (Platform.OS !== "web" || typeof document === "undefined") return 0;
  const root = document.getElementById("root");
  if (!root) return 0;
  return parseInt(window.getComputedStyle(root).paddingTop || "0", 10) || 0;
}

export function useInstallPrompt() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    promptListeners.add(fn);
    return () => { promptListeners.delete(fn); };
  }, []);

  const canNativeInstall = deferredInstallPrompt !== null;
  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredInstallPrompt) return false;
    await deferredInstallPrompt.prompt();
    const res = await deferredInstallPrompt.userChoice;
    if (res.outcome === "accepted") {
      deferredInstallPrompt = null;
      promptListeners.forEach((fn) => fn());
      return true;
    }
    return false;
  };
  return { canNativeInstall, triggerInstall };
}

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export async function showWebNotification(title: string, body: string, tag?: string): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag });
      return true;
    }
    new Notification(title, { body, icon: "/icon-192.png", tag });
    return true;
  } catch {
    return false;
  }
}

export type PushConfig = {
  configured: boolean;
  publicKey: string | null;
};

export type RemoteSchedulePayload = {
  reminderId: string;
  title: string;
  body: string;
  date: string;
  time: string;
  fireAtMs: number;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function getPushConfig(): Promise<PushConfig> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { configured: false, publicKey: null };
  }
  try {
    const res = await fetch("/api/push/public-key", { cache: "no-store" });
    if (!res.ok) return { configured: false, publicKey: null };
    const data = await res.json();
    return {
      configured: Boolean(data?.configured && data?.publicKey),
      publicKey: typeof data?.publicKey === "string" ? data.publicKey : null,
    };
  } catch {
    return { configured: false, publicKey: null };
  }
}

export async function ensureWebPushSubscription(subId: string): Promise<{ ok: boolean; configured: boolean; reason?: string }> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { ok: false, configured: false, reason: "unsupported" };
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, configured: false, reason: "no-push-manager" };
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { ok: false, configured: false, reason: "no-permission" };
  }
  const cfg = await getPushConfig();
  if (!cfg.configured || !cfg.publicKey) {
    return { ok: false, configured: false, reason: "server-unconfigured" };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(cfg.publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId, subscription: sub.toJSON() }),
    });
    if (!res.ok) return { ok: false, configured: true, reason: "subscribe-failed" };
    return { ok: true, configured: true };
  } catch {
    return { ok: false, configured: true, reason: "subscribe-error" };
  }
}

export async function scheduleRemoteReminderPush(subId: string, payload: RemoteSchedulePayload): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/push/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId, ...payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function cancelRemoteReminderPush(subId: string, reminderIds: string[]): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined" || !reminderIds.length) return false;
  try {
    const res = await fetch("/api/push/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId, reminderIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendRemoteTestPush(subId: string): Promise<{ ok: boolean; configured: boolean }> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { ok: false, configured: false };
  }
  const subStatus = await ensureWebPushSubscription(subId);
  if (!subStatus.configured) return { ok: false, configured: false };
  if (!subStatus.ok) return { ok: false, configured: true };
  try {
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId }),
    });
    return { ok: res.ok, configured: true };
  } catch {
    return { ok: false, configured: true };
  }
}
