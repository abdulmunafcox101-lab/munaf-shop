import { Capacitor, registerPlugin } from '@capacitor/core';
import { Contact, KhataEntry, Locale, SaleInvoice } from '../types/shop';
import { formatTaka } from './shopService';

export interface PairedPrinterDevice {
  name: string;
  address: string;
}

interface ThermalPrinterPluginInterface {
  requestPrinterPermissions(): Promise<{ granted: boolean }>;
  listPairedPrinters(): Promise<{ devices: PairedPrinterDevice[] }>;
  printEscPosReceipt(options: {
    deviceAddress: string;
    shopHeader: string;
    receiptText: string;
  }): Promise<{ printed: boolean; deviceAddress: string }>;
}

const ThermalPrinterNative = registerPlugin<ThermalPrinterPluginInterface>('ThermalPrinter');

const SAVED_PRINTER_KEY = 'munaf_thermal_printer_v1';

export function getSavedPrinter(): PairedPrinterDevice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_PRINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PairedPrinterDevice>;
    if (parsed.address && parsed.name) {
      return { name: parsed.name, address: parsed.address };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSavedPrinter(printer: PairedPrinterDevice | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!printer) {
      window.localStorage.removeItem(SAVED_PRINTER_KEY);
    } else {
      window.localStorage.setItem(SAVED_PRINTER_KEY, JSON.stringify(printer));
    }
  } catch {
    // Ignore storage error
  }
}

export function isNativePrinterSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function listPairedBluetoothPrinters(): Promise<PairedPrinterDevice[]> {
  if (!isNativePrinterSupported()) {
    return [];
  }
  const perm = await ThermalPrinterNative.requestPrinterPermissions();
  if (!perm.granted) {
    throw new Error('Bluetooth permission was denied.');
  }
  const res = await ThermalPrinterNative.listPairedPrinters();
  return res.devices ?? [];
}

export async function printReceiptToBluetoothPrinter(
  deviceAddress: string,
  shopHeader: string,
  receiptText: string
): Promise<void> {
  if (!isNativePrinterSupported()) {
    throw new Error('Bluetooth ESC/POS printing is only available inside the Android app.');
  }
  await ThermalPrinterNative.printEscPosReceipt({
    deviceAddress,
    shopHeader,
    receiptText,
  });
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
}

function padBetween(left: string, right: string, cols: number): string {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  const space = Math.max(1, cols - cleanLeft.length - cleanRight.length);
  if (cleanLeft.length + cleanRight.length + 1 > cols) {
    return `${cleanLeft.slice(0, Math.max(4, cols - cleanRight.length - 1))} ${cleanRight}`;
  }
  return `${cleanLeft}${' '.repeat(space)}${cleanRight}`;
}

export function formatInvoiceForThermalPrinter(
  inv: SaleInvoice,
  shop: { shopName: string; phone?: string; address?: string },
  widthMm: 58 | 80,
  locale: Locale
): { header: string; body: string } {
  const cols = widthMm === 80 ? 44 : 32;
  const sep = '-'.repeat(cols);
  const dbl = '='.repeat(cols);

  const lines: string[] = [];
  if (shop.address) lines.push(shop.address.slice(0, cols));
  if (shop.phone) lines.push(`Tel: ${shop.phone}`);
  lines.push(sep);
  lines.push(padBetween(`Memo: ${inv.invoiceNo}`, inv.paymentMode.toUpperCase(), cols));
  const dt = inv.createdAt
    ? inv.createdAt.toDate().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Today';
  lines.push(`Date: ${dt}`);
  if (inv.contactName) {
    lines.push(`Cust: ${inv.contactName.slice(0, cols - 6)}`);
  }
  lines.push(sep);
  lines.push(padBetween('Item', 'Total', cols));
  lines.push(sep);

  inv.items.forEach((it) => {
    lines.push(padRight(it.name, cols));
    const qtyPrice = `  ${it.qty} x ${formatTaka(it.unitPrice)}`;
    lines.push(padBetween(qtyPrice, formatTaka(it.lineTotal), cols));
  });

  lines.push(sep);
  lines.push(padBetween('Subtotal:', formatTaka(inv.subtotal), cols));
  if (inv.discount > 0) {
    lines.push(padBetween('Discount:', `-${formatTaka(inv.discount)}`, cols));
  }
  if (inv.loyaltyRedeemed && inv.loyaltyRedeemed > 0) {
    lines.push(padBetween('Points Used:', `-${inv.loyaltyRedeemed} pts`, cols));
  }
  lines.push(dbl);
  lines.push(padBetween('TOTAL:', formatTaka(inv.totalAmount), cols));
  lines.push(dbl);
  if (inv.loyaltyEarned && inv.loyaltyEarned > 0) {
    lines.push(`Loyalty Earned: +${inv.loyaltyEarned} pts`);
  }
  lines.push(
    locale === 'bn'
      ? 'ধন্যবাদ, আবার আসবেন! (MUNAF SHOP)'
      : 'Thank you for your business!'
  );

  return {
    header: shop.shopName || 'MUNAF SHOP',
    body: lines.join('\n'),
  };
}

export function formatKhataSlipForThermalPrinter(
  contact: Contact,
  entries: KhataEntry[],
  shop: { shopName: string; phone?: string; address?: string },
  widthMm: 58 | 80,
  locale: Locale
): { header: string; body: string } {
  const cols = widthMm === 80 ? 44 : 32;
  const sep = '-'.repeat(cols);
  const dbl = '='.repeat(cols);

  const lines: string[] = [];
  if (shop.address) lines.push(shop.address.slice(0, cols));
  if (shop.phone) lines.push(`Tel: ${shop.phone}`);
  lines.push(sep);
  lines.push(`Party: ${contact.name}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  lines.push(
    `Date: ${new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`
  );
  lines.push(dbl);
  const statusLabel =
    contact.balance > 0
      ? locale === 'bn'
        ? 'পাবো (Due):'
        : 'Receivable:'
      : contact.balance < 0
      ? locale === 'bn'
        ? 'দেবো (Advance):'
        : 'Payable:'
      : 'Settled:';
  lines.push(padBetween(statusLabel, formatTaka(Math.abs(contact.balance)), cols));
  if (contact.dueDate && contact.balance > 0) {
    lines.push(`Due Date: ${contact.dueDate}`);
  }
  if ((contact.loyaltyPoints ?? 0) > 0) {
    lines.push(`Loyalty Points: ${contact.loyaltyPoints} pts`);
  }
  lines.push(sep);
  lines.push('Recent Transactions:');
  entries.slice(0, 8).forEach((e) => {
    const sign = e.entryType === 'dilam' ? '+' : '-';
    const dt = e.createdAt
      ? e.createdAt.toDate().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        })
      : 'Now';
    const note = (e.note || (e.entryType === 'dilam' ? 'Dilam' : 'Pelam')).slice(0, 16);
    lines.push(padBetween(`${dt} ${note}`, `${sign}${formatTaka(e.amount)}`, cols));
  });
  lines.push(sep);
  lines.push('Powered by MUNAF SHOP');

  return {
    header: shop.shopName || 'MUNAF SHOP',
    body: lines.join('\n'),
  };
}

export function printBrowserReceiptSlip(
  header: string,
  body: string,
  widthMm: 58 | 80
): void {
  const existing = document.getElementById('munaf-thermal-print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'munaf-thermal-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const safeHeader = header.replace(/[<>&]/g, '');
  const safeBody = body.replace(/[<>&]/g, '');
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 2mm; size: ${widthMm}mm auto; }
  body {
    font-family: 'Courier New', monospace;
    width: ${widthMm - 4}mm;
    margin: 0 auto;
    font-size: ${widthMm === 80 ? '12px' : '10.5px'};
    line-height: 1.38;
    color: #000;
  }
  h1 {
    font-size: ${widthMm === 80 ? '15px' : '13px'};
    text-align: center;
    margin: 0 0 4px;
    font-weight: 800;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
  }
</style>
</head>
<body>
  <h1>${safeHeader}</h1>
  <pre>${safeBody}</pre>
</body>
</html>`);
  doc.close();

  window.setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 2000);
    }
  }, 160);
}
