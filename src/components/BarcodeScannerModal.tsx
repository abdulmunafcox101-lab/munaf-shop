import React, { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, ScanLine, X } from 'lucide-react';
import { Locale } from '../types/shop';

interface BarcodeScannerModalProps {
  locale: Locale;
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

function playScanBeep(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // Ignore audio errors
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  locale,
  title,
  onDetected,
  onClose,
}) => {
  const reactId = useId().replace(/:/g, '_');
  const regionId = `qr_reader_${reactId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const html5Qr = new Html5Qrcode(regionId);
    scannerRef.current = html5Qr;

    const startScanner = async () => {
      try {
        await html5Qr.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 140 },
          },
          (decodedText) => {
            if (!active || handledRef.current) return;
            const clean = decodedText.trim();
            if (!clean) return;
            handledRef.current = true;
            playScanBeep();
            void html5Qr
              .stop()
              .catch(() => {})
              .finally(() => {
                onDetected(clean);
              });
          },
          () => {
            // Ignore frame decode misses
          }
        );
        if (active) setStarting(false);
      } catch {
        if (!active) return;
        setStarting(false);
        setCameraError(
          locale === 'bn'
            ? 'ক্যামেরা চালু করা যায়নি। নিচের বক্সে হাতে বা স্ক্যানার দিয়ে কোড লিখুন।'
            : 'Unable to access camera. Enter or scan code manually below.'
        );
      }
    };

    void startScanner();

    return () => {
      active = false;
      const inst = scannerRef.current;
      if (inst) {
        void inst
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              inst.clear();
            } catch {
              // ignore cleanup errors
            }
          });
      }
    };
  }, [locale, onDetected, regionId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playScanBeep();
    onDetected(clean);
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md glass-3d-tile rounded-3xl p-5 bg-white space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
              <ScanLine className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {title ||
                  (locale === 'bn'
                    ? 'ক্যামেরা বারকোড / QR স্ক্যানার'
                    : 'Camera Barcode / QR Scanner')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? 'পণ্যের বারকোড বা QR কোড ক্যামেরার সামনে ধরুন'
                  : 'Point camera at product barcode or QR code'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[220px] flex items-center justify-center">
          <div id={regionId} className="w-full" />
          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90 text-xs font-semibold bg-slate-950/75">
              <Camera className="w-6 h-6 animate-pulse text-amber-300" />
              <span>
                {locale === 'bn' ? 'ক্যামেরা চালু হচ্ছে...' : 'Starting camera...'}
              </span>
            </div>
          )}
          {cameraError && (
            <div className="p-5 text-center space-y-2 text-amber-200 text-xs font-medium">
              <Camera className="w-7 h-7 mx-auto opacity-80" />
              <p>{cameraError}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {locale === 'bn'
                ? 'অথবা বারকোড / SKU লিখে এন্টার দিন'
                : 'Or enter Barcode / SKU manually'}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={locale === 'bn' ? 'যেমন: 8901234567' : 'e.g. 8901234567'}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono-num"
            />
            <button
              type="submit"
              className="btn-3d px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
            >
              {locale === 'bn' ? 'ব্যবহার করুন' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
