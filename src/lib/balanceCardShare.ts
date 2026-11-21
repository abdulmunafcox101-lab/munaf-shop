import { Contact, Locale, PaymentGatewaysConfig } from '../types/shop';
import { formatTaka } from './shopService';

export interface BalanceCardResult {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDeterministicQrPattern(
  ctx: CanvasRenderingContext2D,
  seedText: string,
  x: number,
  y: number,
  size: number
): void {
  const cells = 15;
  const cellSize = size / cells;

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, x - 8, y - 8, size + 16, size + 16, 12);
  ctx.fill();

  const drawFinder = (fx: number, fy: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + fx * cellSize, y + fy * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + (fx + 1) * cellSize, y + (fy + 1) * cellSize, 3 * cellSize, 3 * cellSize);
    ctx.fillStyle = '#B91C1C';
    ctx.fillRect(x + (fx + 2) * cellSize, y + (fy + 2) * cellSize, cellSize, cellSize);
  };

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  ctx.fillStyle = '#0f172a';
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const inTopLeft = row < 6 && col < 6;
      const inTopRight = row < 6 && col >= cells - 6;
      const inBottomLeft = row >= cells - 6 && col < 6;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      hash ^= (row * 31 + col * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      if ((hash >>> 3) % 2 === 0) {
        ctx.fillRect(
          x + col * cellSize + 0.5,
          y + row * cellSize + 0.5,
          cellSize - 1,
          cellSize - 1
        );
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(cells - 5, 0);
  drawFinder(0, cells - 5);
}

async function loadImageOptional(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateCustomerBalanceCardPng(opts: {
  contact: Contact;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  gateways?: PaymentGatewaysConfig;
  locale: Locale;
}): Promise<BalanceCardResult> {
  const { contact, shopName, shopPhone, shopAddress, gateways, locale } = opts;
  const width = 920;
  const height = 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');

  // Soft gold & crimson luxury card backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#fdfbf7');
  bgGrad.addColorStop(0.55, '#faf3e4');
  bgGrad.addColorStop(1, '#fff5f5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer frame
  ctx.strokeStyle = '#e7d7b4';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 14, 14, width - 28, height - 28, 28);
  ctx.stroke();

  // Crimson Header Band
  const headerGrad = ctx.createLinearGradient(28, 28, width - 28, 145);
  headerGrad.addColorStop(0, '#991b1b');
  headerGrad.addColorStop(0.65, '#b91c1c');
  headerGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = headerGrad;
  drawRoundedRect(ctx, 28, 28, width - 56, 118, 22);
  ctx.fill();

  // Header text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Outfit", "Noto Sans Bengali", sans-serif';
  ctx.fillText(shopName.slice(0, 30), 54, 82);

  ctx.fillStyle = '#fde68a';
  ctx.font = '600 18px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
  const subLine = [shopPhone ? `Tel: ${shopPhone}` : '', shopAddress || '']
    .filter(Boolean)
    .join(' · ')
    .slice(0, 62);
  ctx.fillText(subLine || 'MUNAF SHOP · Digital Tally Card', 54, 116);

  // Badge on right of header
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  drawRoundedRect(ctx, width - 258, 52, 206, 62, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Noto Sans Bengali", sans-serif';
  ctx.fillText(locale === 'bn' ? 'ডিজিটাল হিসাব কার্ড' : 'BALANCE CARD', width - 238, 82);
  ctx.fillStyle = '#fde68a';
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.fillText(
    new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    width - 238,
    104
  );

  // Customer Avatar or Initials
  const avatarX = 56;
  const avatarY = 178;
  const avatarSize = 86;
  const img = await loadImageOptional(contact.photoUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = '#fee2e2';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = contact.name.trim().slice(0, 2).toUpperCase() || 'M';
    ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 2);
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Customer Name & Phone
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px "Outfit", "Noto Sans Bengali", sans-serif';
  ctx.fillText(contact.name.slice(0, 28), 162, 212);

  ctx.fillStyle = '#475569';
  ctx.font = '600 19px "JetBrains Mono", "Noto Sans Bengali", monospace';
  ctx.fillText(
    contact.phone || (locale === 'bn' ? 'মোবাইল সংযুক্ত নয়' : 'No phone'),
    162,
    244
  );

  if (contact.address) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
    ctx.fillText(contact.address.slice(0, 40), 162, 270);
  }

  // Balance Box
  const isDue = contact.balance > 0;
  const isAdv = contact.balance < 0;
  ctx.fillStyle = isDue ? '#fff1f2' : isAdv ? '#ecfdf5' : '#f8fafc';
  drawRoundedRect(ctx, 50, 294, 590, 126, 20);
  ctx.fill();
  ctx.strokeStyle = isDue ? '#fecdd3' : isAdv ? '#a7f3d0' : '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isDue ? '#be123c' : isAdv ? '#047857' : '#475569';
  ctx.font = 'bold 19px "Noto Sans Bengali", sans-serif';
  const balLabel = isDue
    ? locale === 'bn'
      ? 'মোট বাকি (দোকান পাবে)'
      : 'Total Due Balance'
    : isAdv
    ? locale === 'bn'
      ? 'অগ্রিম জমা (দোকান দেবে)'
      : 'Advance Credit'
    : locale === 'bn'
    ? 'হিসাব পরিশোধিত'
    : 'Settled Balance';
  ctx.fillText(balLabel, 76, 332);

  ctx.fillStyle = isDue ? '#b91c1c' : isAdv ? '#065f46' : '#0f172a';
  ctx.font = 'bold 48px "JetBrains Mono", "Noto Sans Bengali", monospace';
  ctx.fillText(formatTaka(Math.abs(contact.balance)), 76, 392);

  // Payment QR Panel on bottom-right
  const qrPayload =
    gateways?.bkashPaymentLink ||
    gateways?.bkashNumber ||
    shopPhone ||
    `MUNAF:${shopName}`;
  drawDeterministicQrPattern(ctx, qrPayload, width - 216, 214, 152);
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    locale === 'bn' ? 'পেমেন্ট QR / তাগাদা' : 'Payment Info QR',
    width - 140,
    394
  );
  ctx.textAlign = 'left';

  // Footer MFS / Due Date Strip
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, 50, 440, width - 100, 58, 16);
  ctx.fill();

  const payLines: string[] = [];
  if (gateways?.bkashEnabled && gateways.bkashNumber) {
    payLines.push(`bKash: ${gateways.bkashNumber}`);
  }
  if (gateways?.nagadEnabled && gateways.nagadNumber) {
    payLines.push(`Nagad: ${gateways.nagadNumber}`);
  }
  if (contact.dueDate && isDue) {
    payLines.push(`Due Date: ${contact.dueDate}`);
  }
  if ((contact.loyaltyPoints ?? 0) > 0) {
    payLines.push(`Points: ${contact.loyaltyPoints}`);
  }

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 17px "JetBrains Mono", "Noto Sans Bengali", monospace';
  ctx.fillText(
    (payLines.join('   |   ') || `${shopName} · MUNAF SHOP`).slice(0, 74),
    72,
    475
  );

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Could not encode PNG card.'));
    }, 'image/png');
  });

  const safeSlug =
    contact.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'customer';

  return {
    blob,
    dataUrl,
    fileName: `munaf-balance-${safeSlug}.png`,
  };
}

export async function shareOrDownloadBalanceCard(
  card: BalanceCardResult,
  captionText: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([card.blob], card.fileName, { type: 'image/png' });
  const nav = navigator as unknown as {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({
        title: 'MUNAF SHOP Balance Card',
        text: captionText,
        files: [file],
      });
      return 'shared';
    } catch {
      // Fallback to direct download if share dismissed or unsupported
    }
  }

  const a = document.createElement('a');
  a.href = card.dataUrl;
  a.download = card.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return 'downloaded';
}
