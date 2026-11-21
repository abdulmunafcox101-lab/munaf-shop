export const SETTINGS_CHANGED_EVENT = 'munaf-app-settings-changed';

const DECIMAL_STORAGE_KEY = 'munaf_decimal_enabled_v1';
const SOUND_STORAGE_KEY = 'munaf_sound_enabled_v1';
const PUSH_NOTIFY_STORAGE_KEY = 'munaf_push_notify_enabled_v1';

export function getDecimalEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DECIMAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDecimalEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DECIMAL_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  } catch {
    // Ignore storage restrictions
  }
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  } catch {
    // Ignore storage restrictions
  }
}

export function getPushNotifyEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = window.localStorage.getItem(PUSH_NOTIFY_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setPushNotifyEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUSH_NOTIFY_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  } catch {
    // Ignore storage restrictions
  }
}
