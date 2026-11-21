import { Capacitor, registerPlugin } from '@capacitor/core';
import { getPushNotifyEnabled } from './appSettings';

interface SystemNotifyPluginInterface {
  hasNotificationPermission(): Promise<{ granted: boolean }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  showNotification(options: {
    id?: number;
    title: string;
    body: string;
  }): Promise<{ shown: boolean; reason?: string }>;
}

const SystemNotifyNative = registerPlugin<SystemNotifyPluginInterface>('SystemNotify');

export function isNativeAndroidNotify(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function hasSystemNotificationPermission(): Promise<boolean> {
  if (isNativeAndroidNotify()) {
    try {
      const res = await SystemNotifyNative.hasNotificationPermission();
      return Boolean(res.granted);
    } catch {
      return false;
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }
  return false;
}

export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (isNativeAndroidNotify()) {
    try {
      const res = await SystemNotifyNative.requestNotificationPermission();
      return Boolean(res.granted);
    } catch {
      return false;
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

export async function dispatchSystemNotification(opts: {
  title: string;
  body: string;
}): Promise<void> {
  if (!getPushNotifyEnabled()) return;
  const cleanTitle = opts.title.trim() || 'MUNAF SHOP';
  const cleanBody = opts.body.trim();
  if (!cleanBody) return;

  if (isNativeAndroidNotify()) {
    try {
      await SystemNotifyNative.showNotification({
        id: Math.floor(Date.now() % 1000000),
        title: cleanTitle,
        body: cleanBody,
      });
    } catch {
      // Non-blocking
    }
    return;
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(cleanTitle, {
            body: cleanBody,
            icon: '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_e3c2fa6e.png',
          });
          return;
        }
      }
      new Notification(cleanTitle, {
        body: cleanBody,
        icon: '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_e3c2fa6e.png',
      });
    } catch {
      // Ignore browser block
    }
  }
}
