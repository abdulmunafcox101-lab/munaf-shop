import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Locale } from '../types/shop';
import { AppNotification, VOICE_AVATAR_URL } from '../lib/voiceNotifier';

interface NotificationCenterHeaderProps {
  locale: Locale;
  notifications: AppNotification[];
  voiceEnabled: boolean;
  isSpeaking: boolean;
  open?: boolean;
  compactInboxStyle?: boolean;
  onOpenChange?: (open: boolean) => void;
  onToggleVoice: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onReplayNotification: (item: AppNotification) => void;
  onTestVoice: () => void;
}

export const NotificationCenterControls: React.FC<NotificationCenterHeaderProps> = ({
  locale,
  notifications,
  voiceEnabled,
  isSpeaking,
  open: controlledOpen,
  compactInboxStyle = false,
  onOpenChange,
  onToggleVoice,
  onMarkAllRead,
  onClearAll,
  onReplayNotification,
  onTestVoice,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChangeRef.current?.(next);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        if (controlledOpen === undefined) {
          setInternalOpen(false);
        }
        onOpenChangeRef.current?.(false);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (controlledOpen === undefined) {
          setInternalOpen(false);
        }
        onOpenChangeRef.current?.(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, controlledOpen]);

  const formatTime = (ms: number) => {
    try {
      return new Date(ms).toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onToggleVoice();
        }}
        title={
          voiceEnabled
            ? locale === 'bn'
              ? 'ভয়েস নোটিফিকেশন চালু (মিউট করতে ক্লিক করুন)'
              : 'Voice alerts active (click to mute)'
            : locale === 'bn'
            ? 'ভয়েস নোটিফিকেশন বন্ধ (চালু করতে ক্লিক করুন)'
            : 'Voice alerts muted (click to enable)'
        }
        className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold border rounded-xl cursor-pointer transition-colors whitespace-nowrap ${
          compactInboxStyle
            ? voiceEnabled
              ? 'bg-white/75 text-emerald-800 border-amber-900/15 hover:bg-white'
              : 'bg-white/55 text-slate-600 border-amber-900/10 hover:bg-white/80'
            : voiceEnabled
            ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
        }`}
      >
        {voiceEnabled ? (
          <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
        ) : (
          <VolumeX className="w-3.5 h-3.5" />
        )}
        <span className="hidden md:inline">
          {voiceEnabled
            ? locale === 'bn'
              ? 'ভয়েস'
              : 'Voice'
            : locale === 'bn'
            ? 'মিউট'
            : 'Muted'}
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setOpen(next);
          if (next && unreadCount > 0) {
            onMarkAllRead();
          }
        }}
        title={locale === 'bn' ? 'ইনবক্স ও নোটিফিকেশন' : 'Inbox & Notifications'}
        className={
          compactInboxStyle
            ? 'relative flex flex-col items-center justify-center px-2 py-1 rounded-xl text-slate-900 hover:bg-white/45 cursor-pointer transition-colors'
            : 'relative p-2 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 rounded-xl cursor-pointer transition-colors'
        }
      >
        <div className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-slate-900" />
          ) : (
            <Bell className={compactInboxStyle ? 'w-5 h-5 text-slate-900' : 'w-4 h-4'} />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[16px] px-1 rounded-full bg-[#DC2626] text-white text-[9px] font-bold font-mono-num flex items-center justify-center shadow-sm border border-white/70">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {compactInboxStyle && (
          <span className="text-[10px] font-bold text-slate-900 leading-tight mt-0.5">
            {locale === 'bn' ? 'ইনবক্স' : 'Inbox'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-20 sm:inset-x-auto sm:absolute sm:right-0 sm:top-12 sm:w-96 z-50 glass-3d-tile rounded-2xl p-4 space-y-3 border border-slate-200/90 shadow-2xl">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              {!avatarFailed ? (
                <img
                  src={VOICE_AVATAR_URL}
                  alt="Voice Assistant"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  M
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {locale === 'bn' ? 'ভয়েস নোটিফিকেশন' : 'Voice Notifications'}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {locale === 'bn'
                    ? 'মানুষের কণ্ঠে লাইভ আপডেট অ্যালার্ট'
                    : 'Natural human voice alerts'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onTestVoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>
                {locale === 'bn' ? 'ভয়েস টেস্ট শুনুন' : 'Test Human Voice'}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>{locale === 'bn' ? 'পড়া হয়েছে' : 'Read'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{locale === 'bn' ? 'ক্লিয়ার' : 'Clear'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  {locale === 'bn'
                    ? 'এখনো কোনো নোটিফিকেশন আসেনি।'
                    : 'No notifications yet.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-white/85 border border-slate-200/80 p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                        {item.message}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono-num text-slate-400 shrink-0">
                      {formatTime(item.createdAtMs)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onReplayNotification(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#B91C1C] bg-red-50/80 hover:bg-red-100 rounded-lg cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{locale === 'bn' ? 'শুনুন' : 'Play Voice'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SpokenToastBannerProps {
  locale: Locale;
  activeToast: AppNotification | null;
  isSpeaking: boolean;
  onReplay: (item: AppNotification) => void;
  onDismiss: () => void;
}

export const SpokenToastBanner: React.FC<SpokenToastBannerProps> = ({
  locale,
  activeToast,
  isSpeaking,
  onReplay,
  onDismiss,
}) => {
  const [imgErr, setImgErr] = useState(false);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 no-print">
      <div className="glass-3d-tile rounded-2xl p-3.5 border border-emerald-200/90 shadow-2xl flex items-start gap-3">
        <div className="relative shrink-0">
          {!imgErr ? (
            <img
              src={VOICE_AVATAR_URL}
              alt="Voice Announcer"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-11 h-11 rounded-xl object-cover border border-emerald-300/80 shadow-xs"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#B91C1C] text-white font-bold flex items-center justify-center">
              M
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-900 truncate">
              {activeToast.title}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            {activeToast.message}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onReplay(activeToast)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              <span>
                {isSpeaking
                  ? locale === 'bn'
                    ? 'বলছে...'
                    : 'Speaking...'
                  : locale === 'bn'
                  ? 'আবার শুনুন'
                  : 'Replay'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
