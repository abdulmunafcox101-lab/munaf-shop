import { Locale } from '../types/shop';
import { getSoundEnabled } from './appSettings';
import { getAppVersionHeaders, notifyServerForcedUpdate } from './appVersion';

export type NotificationCategory =
  | 'order'
  | 'upgrade'
  | 'complaint'
  | 'support'
  | 'khata'
  | 'cash'
  | 'telecom'
  | 'stock'
  | 'admin'
  | 'general';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  spokenText: string;
  category: NotificationCategory;
  createdAtMs: number;
  read: boolean;
}

export const VOICE_AVATAR_URL =
  '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_e3c2fa6e.png';

const VOICE_STORAGE_KEY = 'munaf_voice_enabled_v1';

const clientAudioCache = new Map<string, string>();
let activeAudioEl: HTMLAudioElement | null = null;
let activeSpeakRequestId = 0;
let sharedAudioCtx: AudioContext | null = null;
let clientTtsCooldownUntilMs = 0;

export function getSavedVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = window.localStorage.getItem(VOICE_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setSavedVoiceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage restriction
  }
}

export function stopActiveSpeech(): void {
  activeSpeakRequestId += 1;
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // Ignore
    }
    activeAudioEl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export function playSoftNotificationChime(category: NotificationCategory): void {
  if (typeof window === 'undefined' || !getSoundEnabled()) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes =
      category === 'order' || category === 'upgrade'
        ? [587.33, 880, 1174.66]
        : category === 'complaint' || category === 'admin'
        ? [523.25, 659.25]
        : [587.33, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(0.075, now + idx * 0.085 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.085 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.24);
    });
  } catch {
    // Audio playback restricted
  }
}

function speakWithBrowserSynthesis(text: string, locale: Locale): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale === 'bn' ? 'bn-BD' : 'en-US';
      utter.rate = 0.96;
      utter.pitch = 1.02;

      const voices = synth.getVoices();
      const preferred =
        locale === 'bn'
          ? voices.find((v) => v.lang.toLowerCase().startsWith('bn-bd')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('bn'))
          : voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('en'));

      if (preferred) {
        utter.voice = preferred;
      }

      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      synth.speak(utter);
    } catch {
      resolve();
    }
  });
}

export async function speakHumanNotification(
  text: string,
  locale: Locale,
  category: NotificationCategory = 'general',
  onSpeakingChange?: (speaking: boolean) => void
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  stopActiveSpeech();
  const reqId = ++activeSpeakRequestId;

  playSoftNotificationChime(category);
  onSpeakingChange?.(true);

  const cacheKey = `${locale}:${cleanText}`;
  let dataUrl = clientAudioCache.get(cacheKey);
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (!dataUrl && isOnline && Date.now() >= clientTtsCooldownUntilMs) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7500);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAppVersionHeaders(),
        },
        body: JSON.stringify({
          text: cleanText,
          locale,
          voiceName: 'Charon',
        }),
        signal: controller.signal,
      });
      if (res.status === 426) {
        try {
          const errJson = (await res.json()) as { policy?: Record<string, unknown> };
          notifyServerForcedUpdate(errJson.policy);
        } catch {
          notifyServerForcedUpdate();
        }
      } else if (res.ok) {
        const json = (await res.json()) as {
          audioBase64?: string;
          mimeType?: string;
        };
        if (json.audioBase64) {
          const mime = json.mimeType || 'audio/wav';
          dataUrl = `data:${mime};base64,${json.audioBase64}`;
          if (clientAudioCache.size >= 30) {
            const first = clientAudioCache.keys().next().value;
            if (first) clientAudioCache.delete(first);
          }
          clientAudioCache.set(cacheKey, dataUrl);
        }
      } else if (res.status === 429 || res.status === 503) {
        let retryAfterSec = 600;
        try {
          const errJson = (await res.json()) as { retryAfterSec?: number };
          if (typeof errJson.retryAfterSec === 'number' && errJson.retryAfterSec > 0) {
            retryAfterSec = errJson.retryAfterSec;
          }
        } catch {
          // ignore parse error
        }
        clientTtsCooldownUntilMs =
          Date.now() + Math.min(3600_000, Math.max(60_000, retryAfterSec * 1000));
      }
    } catch {
      // Fallback to browser synthesis
    } finally {
      window.clearTimeout(timer);
    }
  }

  if (reqId !== activeSpeakRequestId) {
    return;
  }

  if (dataUrl) {
    let playedSuccessfully = false;
    try {
      const audio = new Audio(dataUrl);
      activeAudioEl = audio;
      playedSuccessfully = await new Promise<boolean>((resolve) => {
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.play().catch(() => resolve(false));
      });
      if (reqId === activeSpeakRequestId) {
        activeAudioEl = null;
      }
    } catch {
      playedSuccessfully = false;
    }
    if (playedSuccessfully) {
      if (reqId === activeSpeakRequestId) {
        onSpeakingChange?.(false);
      }
      return;
    }
  }

  if (reqId !== activeSpeakRequestId) {
    return;
  }

  await speakWithBrowserSynthesis(cleanText, locale);
  if (reqId === activeSpeakRequestId) {
    onSpeakingChange?.(false);
  }
}

export function triggerDesktopBrowserNotification(
  title: string,
  body: string
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: VOICE_AVATAR_URL,
    });
  } catch {
    // Ignore blocked notification
  }
}
