import React, { useEffect, useState } from 'react';
import { Calculator, Check, Copy, Delete, X } from 'lucide-react';
import { Locale } from '../types/shop';

interface CalculatorModalProps {
  locale: Locale;
  onClose: () => void;
}

function safeEvaluate(expr: string): string {
  const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.%() ]/g, '');
  if (!sanitized.trim()) return '0';
  try {
    // Handle percentage tokens like 500+10% or 15%
    const withPercent = sanitized.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    const fn = new Function(`"use strict"; return (${withPercent});`) as () => unknown;
    const res = fn();
    if (typeof res !== 'number' || !Number.isFinite(res)) return 'Error';
    return String(Number(res.toFixed(4)));
  } catch {
    return 'Error';
  }
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ locale, onClose }) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (/^[0-9+\-*/.%()]$/.test(e.key)) {
        e.preventDefault();
        setExpression((prev) => prev + e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        setExpression((prev) => {
          const val = safeEvaluate(prev || '0');
          setResult(val);
          return val === 'Error' ? prev : val;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setExpression((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const append = (token: string) => {
    setExpression((prev) => prev + token);
  };

  const handleEquals = () => {
    const val = safeEvaluate(expression);
    setResult(val);
    if (val !== 'Error') {
      setExpression(val);
    }
  };

  const handleClear = () => {
    setExpression('');
    setResult('0');
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleCopy = async () => {
    const target = result !== 'Error' && result !== '0' ? result : expression || '0';
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const previewVal = expression ? safeEvaluate(expression) : result;

  const keys: { label: string; value?: string; action?: () => void; tone: string }[] = [
    { label: 'AC', action: handleClear, tone: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
    { label: '%', value: '%', tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
    { label: '÷', value: '÷', tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
    { label: '⌫', action: handleBackspace, tone: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { label: '7', value: '7', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '8', value: '8', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '9', value: '9', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '×', value: '×', tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
    { label: '4', value: '4', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '5', value: '5', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '6', value: '6', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '-', value: '-', tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
    { label: '1', value: '1', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '2', value: '2', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '3', value: '3', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '+', value: '+', tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
    { label: '00', value: '00', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '0', value: '0', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '.', value: '.', tone: 'bg-white text-slate-900 hover:bg-slate-50' },
    { label: '=', action: handleEquals, tone: 'bg-[#B91C1C] text-white hover:bg-[#991B1B]' },
  ];

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xs glass-3d-tile rounded-3xl p-5 bg-white space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#B91C1C]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {locale === 'bn' ? 'দোকান ক্যালকুলেটর' : 'Quick Calculator'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-950 text-white p-4 space-y-1 text-right">
          <p className="text-xs font-mono-num text-slate-400 min-h-[18px] break-all">
            {expression || '0'}
          </p>
          <p className="text-2xl font-extrabold font-mono-num text-amber-300 truncate">
            {previewVal !== 'Error' ? previewVal : result}
          </p>
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{locale === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{locale === 'bn' ? 'ফলাফল কপি' : 'Copy Result'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => (k.action ? k.action() : k.value && append(k.value))}
              className={`h-11 rounded-xl border border-slate-200/80 font-mono-num text-sm font-extrabold flex items-center justify-center shadow-xs cursor-pointer transition-colors ${k.tone}`}
            >
              {k.label === '⌫' ? <Delete className="w-4 h-4" /> : k.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
