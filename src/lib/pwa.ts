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
