import { AppUpdateConfig } from '../types/shop';

export const APP_VERSION_NAME = '1.0.0';
export const APP_VERSION_CODE = 1;
export const FORCE_UPDATE_EVENT = 'munaf-force-update-required';

export interface InstalledAppVersion {
  versionCode: number;
  versionName: string;
  isNativeAndroid: boolean;
  platform: 'android' | 'web';
  canRequestPackageInstalls?: boolean;
}

export interface ApkDownloadProgress {
  status: 'starting' | 'downloading' | 'installing' | 'opened_browser' | 'permission_required' | 'error';
  percent: number;
  downloadedBytes?: number;
  totalBytes?: number;
  message?: string;
}

interface NativeAppUpdatePlugin {
  getAppInfo(): Promise<{
    versionCode: number;
    versionName: string;
    packageName?: string;
    canRequestPackageInstalls?: boolean;
  }>;
  openInstallPermissionSettings(): Promise<{ opened: boolean }>;
  downloadAndInstallApk(opts: {
    url: string;
    versionName: string;
  }): Promise<{
    started: boolean;
    needsInstallPermission?: boolean;
    openedBrowser?: boolean;
    message?: string;
  }>;
  openExternalDownloadUrl(opts: { url: string }): Promise<{ opened: boolean }>;
  addListener?: (
    eventName: string,
    listenerFunc: (data: ApkDownloadProgress) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

function getNativeAppUpdatePlugin(): NativeAppUpdatePlugin | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      Plugins?: {
        AppUpdate?: NativeAppUpdatePlugin;
      };
    };
  };
  const cap = win.Capacitor;
  if (!cap) return null;
  const plugin = cap.Plugins?.AppUpdate;
  if (plugin && typeof plugin.getAppInfo === 'function') {
    return plugin;
  }
  return null;
}

export function isNativeAndroidEnv(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  };
  const cap = win.Capacitor;
  if (!cap) return false;
  const isNative = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : false;
  const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
  return isNative && platform === 'android';
}

let cachedInstalledVersion: InstalledAppVersion = {
  versionCode: APP_VERSION_CODE,
  versionName: APP_VERSION_NAME,
  isNativeAndroid: false,
  platform: 'web',
};

export function getCachedInstalledVersion(): InstalledAppVersion {
  return cachedInstalledVersion;
}

export async function getInstalledAppVersion(): Promise<InstalledAppVersion> {
  const plugin = getNativeAppUpdatePlugin();
  if (plugin) {
    try {
      const info = await plugin.getAppInfo();
      const code = Number(info.versionCode);
      cachedInstalledVersion = {
        versionCode: Number.isFinite(code) && code > 0 ? code : APP_VERSION_CODE,
        versionName: (info.versionName || APP_VERSION_NAME).trim(),
        isNativeAndroid: true,
        platform: 'android',
        canRequestPackageInstalls: info.canRequestPackageInstalls ?? true,
      };
      return cachedInstalledVersion;
    } catch {
      // Fallback to compiled web constants below
    }
  }

  const nativeAndroid = isNativeAndroidEnv();
  cachedInstalledVersion = {
    versionCode: APP_VERSION_CODE,
    versionName: APP_VERSION_NAME,
    isNativeAndroid: nativeAndroid,
    platform: nativeAndroid ? 'android' : 'web',
  };
  return cachedInstalledVersion;
}

export function isAppVersionOutdated(
  installedVersionCode: number,
  config: AppUpdateConfig | null | undefined
): boolean {
  if (!config || !config.forceUpdate) return false;
  const minRequired = Math.max(
    Number(config.minSupportedVersionCode) || 0,
    Number(config.latestVersionCode) || 0
  );
  if (minRequired <= 1 && installedVersionCode >= 1) {
    return installedVersionCode < minRequired;
  }
  return installedVersionCode < minRequired;
}

export function getAppVersionHeaders(): Record<string, string> {
  const current = getCachedInstalledVersion();
  return {
    'X-App-Version-Code': String(current.versionCode),
    'X-App-Version-Name': current.versionName,
    'X-App-Platform': current.platform,
  };
}

export function notifyServerForcedUpdate(detail?: Partial<AppUpdateConfig>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(FORCE_UPDATE_EVENT, {
      detail: detail ?? null,
    })
  );
}

export async function triggerNativeApkInstall(
  url: string,
  versionName: string,
  onProgress?: (progress: ApkDownloadProgress) => void
): Promise<{
  mode: 'native_installer' | 'permission_required' | 'browser';
  message?: string;
}> {
  const cleanUrl = url.trim();
  const plugin = getNativeAppUpdatePlugin();

  if (plugin && typeof plugin.downloadAndInstallApk === 'function') {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    try {
      if (onProgress && typeof plugin.addListener === 'function') {
        listenerHandle = await plugin.addListener('apkDownloadProgress', onProgress);
      }
      const res = await plugin.downloadAndInstallApk({
        url: cleanUrl,
        versionName,
      });
      if (res.needsInstallPermission) {
        return {
          mode: 'permission_required',
          message: res.message,
        };
      }
      if (res.openedBrowser) {
        return {
          mode: 'browser',
          message: res.message,
        };
      }
      return {
        mode: 'native_installer',
        message: res.message,
      };
    } finally {
      if (listenerHandle) {
        window.setTimeout(() => {
          void listenerHandle?.remove().catch(() => undefined);
        }, 60000);
      }
    }
  }

  // Browser / PWA fallback without window.open popup block
  const anchor = document.createElement('a');
  anchor.href = cleanUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  if (cleanUrl.toLowerCase().endsWith('.apk')) {
    anchor.download = `MUNAF-SHOP-v${versionName || 'latest'}.apk`;
  }
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return { mode: 'browser' };
}

export async function openAndroidInstallSettings(): Promise<boolean> {
  const plugin = getNativeAppUpdatePlugin();
  if (!plugin || typeof plugin.openInstallPermissionSettings !== 'function') {
    return false;
  }
  try {
    const res = await plugin.openInstallPermissionSettings();
    return Boolean(res.opened);
  } catch {
    return false;
  }
}

export async function openExternalApkUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  const plugin = getNativeAppUpdatePlugin();
  if (plugin && typeof plugin.openExternalDownloadUrl === 'function') {
    try {
      await plugin.openExternalDownloadUrl({ url: cleanUrl });
      return;
    } catch {
      // Fallback below
    }
  }
  const anchor = document.createElement('a');
  anchor.href = cleanUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
