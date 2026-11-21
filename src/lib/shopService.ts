import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { getDecimalEnabled } from './appSettings';
import { getAppVersionHeaders, notifyServerForcedUpdate } from './appVersion';
import {
  AccountStatus,
  AppUpdateConfig,
  CashType,
  CatalogAccentColor,
  ComplaintSeverity,
  ComplaintStatus,
  Contact,
  ContactType,
  InstallmentPlan,
  KhataEntry,
  KhataEntryType,
  PaymentAccountType,
  PaymentGatewayId,
  PaymentGatewaysConfig,
  PlanPricingConfig,
  PlanTier,
  Product,
  PurchaseOrderItem,
  SaleInvoice,
  SaleInvoiceItem,
  StaffMember,
  StaffRole,
  SupportTicketStatus,
  TelecomOperator,
  TelecomServiceType,
  UpgradeRequest,
  UpgradeRequestStatus,
} from '../types/shop';

export const SUPPORT_HELPLINE = '01608603364';
export const SUPER_ADMIN_EMAIL = 'nahidulislamnahid357@gmail.com';
export const DEFAULT_BKASH_PAYMENT_LINK =
  'https://shop.bkash.com/coffee-store01608603364/paymentlink/default-payment';

export const DEFAULT_PRICING: PlanPricingConfig = {
  proMonthly: 199,
  proYearly: 1990,
  businessMonthly: 499,
  businessYearly: 4990,
  discountNote: '',
};

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGatewaysConfig = {
  bkashNumber: SUPPORT_HELPLINE,
  bkashType: 'merchant',
  bkashEnabled: true,
  bkashNote: 'বিকাশ পেমেন্ট লিংক দিয়ে পে করে TrxID সাবমিট করুন',
  bkashPaymentLink: DEFAULT_BKASH_PAYMENT_LINK,
  nagadNumber: SUPPORT_HELPLINE,
  nagadType: 'personal',
  nagadEnabled: true,
  nagadNote: 'Send Money করে TrxID সাবমিট করুন',
  rocketNumber: SUPPORT_HELPLINE,
  rocketType: 'personal',
  rocketEnabled: true,
  rocketNote: 'Send Money / রকেট ট্রান্সফার করুন',
  upayNumber: SUPPORT_HELPLINE,
  upayType: 'personal',
  upayEnabled: true,
  upayNote: 'উপায় অ্যাপ থেকে সেন্ড মানি করুন',
  gpayNumber: SUPPORT_HELPLINE,
  gpayType: 'gpay',
  gpayEnabled: true,
  gpayNote: 'GPay / Grameenphone Pay নম্বর বা আইডি',
};

export const DEFAULT_APP_UPDATE_CONFIG: AppUpdateConfig = {
  latestVersionName: '1.0.0',
  latestVersionCode: 1,
  minSupportedVersionCode: 1,
  apkDownloadUrl: '',
  updateDescription: '',
  forceUpdate: false,
  publishedBy: 'Owner',
  updatedAt: null,
};

let clientUpdateBlocked = false;

export function setClientUpdateBlocked(blocked: boolean): void {
  clientUpdateBlocked = blocked;
}

export function assertClientVersionCurrent(path?: string): void {
  if (clientUpdateBlocked && path !== 'platformConfig/appUpdate') {
    notifyServerForcedUpdate();
    throw new Error(
      'App update required. Please update MUNAF SHOP to continue using features.'
    );
  }
}

export function normalizeSafeUpdateUrl(raw?: string): string {
  const trimmed = (raw ?? '').trim().slice(0, 500);
  if (!trimmed) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${trimmed}`;
    }
    return trimmed;
  }
  return '';
}

export interface GatewayDescriptor {
  id: PaymentGatewayId;
  nameBn: string;
  nameEn: string;
  shortCode: string;
  brandHex: string;
  softBgClass: string;
  borderClass: string;
  textClass: string;
  buttonBgClass: string;
  number: string;
  accountType: PaymentAccountType;
  enabled: boolean;
  note: string;
  paymentLink?: string;
}

export function normalizeSafePaymentUrl(raw?: string): string {
  const trimmed = (raw ?? '').trim().slice(0, 240);
  if (!trimmed) return '';
  if (trimmed.startsWith('https://')) return trimmed;
  return '';
}

export function getGatewayDescriptors(
  config: PaymentGatewaysConfig
): GatewayDescriptor[] {
  return [
    {
      id: 'bKash',
      nameBn: 'বিকাশ (bKash)',
      nameEn: 'bKash',
      shortCode: 'bK',
      brandHex: '#E2136E',
      softBgClass: 'bg-[#E2136E]/10',
      borderClass: 'border-[#E2136E]/30',
      textClass: 'text-[#C20E5D]',
      buttonBgClass: 'bg-[#E2136E] hover:bg-[#C20E5D]',
      number: config.bkashNumber,
      accountType: config.bkashType,
      enabled: config.bkashEnabled,
      note: config.bkashNote ?? '',
      paymentLink:
        normalizeSafePaymentUrl(config.bkashPaymentLink) || DEFAULT_BKASH_PAYMENT_LINK,
    },
    {
      id: 'Nagad',
      nameBn: 'নগদ (Nagad)',
      nameEn: 'Nagad',
      shortCode: 'ন',
      brandHex: '#F26522',
      softBgClass: 'bg-[#F26522]/10',
      borderClass: 'border-[#F26522]/30',
      textClass: 'text-[#D64D0D]',
      buttonBgClass: 'bg-[#F26522] hover:bg-[#D64D0D]',
      number: config.nagadNumber,
      accountType: config.nagadType,
      enabled: config.nagadEnabled,
      note: config.nagadNote ?? '',
    },
    {
      id: 'Rocket',
      nameBn: 'রকেট (Rocket)',
      nameEn: 'Rocket',
      shortCode: 'RK',
      brandHex: '#8C3494',
      softBgClass: 'bg-[#8C3494]/10',
      borderClass: 'border-[#8C3494]/30',
      textClass: 'text-[#76267D]',
      buttonBgClass: 'bg-[#8C3494] hover:bg-[#76267D]',
      number: config.rocketNumber,
      accountType: config.rocketType,
      enabled: config.rocketEnabled,
      note: config.rocketNote ?? '',
    },
    {
      id: 'Upay',
      nameBn: 'উপায় (Upay)',
      nameEn: 'Upay',
      shortCode: 'উ',
      brandHex: '#00529B',
      softBgClass: 'bg-[#00529B]/10',
      borderClass: 'border-[#00529B]/30',
      textClass: 'text-[#004482]',
      buttonBgClass: 'bg-[#00529B] hover:bg-[#003F7A]',
      number: config.upayNumber,
      accountType: config.upayType,
      enabled: config.upayEnabled,
      note: config.upayNote ?? '',
    },
    {
      id: 'GPay',
      nameBn: 'জি পে (GPay)',
      nameEn: 'GPay',
      shortCode: 'G',
      brandHex: '#1A73E8',
      softBgClass: 'bg-[#1A73E8]/10',
      borderClass: 'border-[#1A73E8]/30',
      textClass: 'text-[#155CC0]',
      buttonBgClass: 'bg-[#1A73E8] hover:bg-[#155CC0]',
      number: config.gpayNumber,
      accountType: config.gpayType,
      enabled: config.gpayEnabled,
      note: config.gpayNote ?? '',
    },
  ];
}

export function formatTaka(amount: number, showDecimals?: boolean): string {
  const num = Number.isFinite(amount) ? amount : 0;
  const decimals = showDecimals ?? getDecimalEnabled();
  return decimals
    ? `৳${num.toLocaleString('en-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : `৳${Math.round(num).toLocaleString('en-BD', {
        maximumFractionDigits: 0,
      })}`;
}

export function sanitizeStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizePhotoUrl(val?: string): string {
  const clean = (val ?? '').trim();
  if (!clean) return '';
  if (clean.length > 59000) return '';
  return clean;
}

export function withOptionalBranch(branchId?: string): Record<string, string> {
  const clean = sanitizeStr(branchId ?? '', 64);
  if (!clean || clean === 'main') return {};
  return { branchId: clean };
}

export function normalizeIsoDate(dateStr?: string): string {
  const clean = sanitizeStr(dateStr ?? '', 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function shiftIsoDueDate(
  dateStr: string,
  frequency: 'weekly' | 'monthly'
): string {
  const clean = normalizeIsoDate(dateStr);
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (frequency === 'weekly') {
    dt.setDate(dt.getDate() + 7);
  } else {
    dt.setMonth(dt.getMonth() + 1);
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

export function phoneOrEmailToAuthEmail(identifier: string): {
  authEmail: string;
  isPhoneAlias: boolean;
  normalizedPhone: string;
} {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return {
      authEmail: trimmed.toLowerCase(),
      isPhoneAlias: false,
      normalizedPhone: '',
    };
  }
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 13) {
    digits = `0${digits.slice(3)}`;
  }
  return {
    authEmail: `p_${digits}@munafshop.app`,
    isPhoneAlias: true,
    normalizedPhone: digits,
  };
}

export async function compressImageToDataUrl(
  file: File,
  maxDim = 160,
  quality = 0.72
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image file.'));
      el.src = objectUrl;
    });

    const render = (dim: number, q: number): string => {
      const canvas = document.createElement('canvas');
      canvas.width = dim;
      canvas.height = dim;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Center-crop square for crisp circular avatars
      const side = Math.min(img.width, img.height);
      const sx = Math.max(0, Math.floor((img.width - side) / 2));
      const sy = Math.max(0, Math.floor((img.height - side) / 2));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
      return canvas.toDataURL('image/jpeg', q);
    };

    let dataUrl = render(maxDim, quality);
    if (dataUrl.length > 50000) {
      dataUrl = render(112, 0.56);
    }
    if (dataUrl.length > 58000) {
      dataUrl = render(96, 0.45);
    }
    if (dataUrl.length > 59000) {
      throw new Error('Image is still too large after compression.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

async function commitWriteOfflineSafe(
  writePromise: Promise<void>,
  operationType: OperationType,
  path: string
): Promise<void> {
  assertClientVersionCurrent(path);
  let returnedOptimistically = false;

  const tracked = writePromise.catch((err) => {
    if (returnedOptimistically) {
      console.warn(`Deferred cloud sync warning (${operationType} ${path}):`, err);
      return;
    }
    handleFirestoreError(err, operationType, path);
  });

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    returnedOptimistically = true;
    await new Promise<void>((resolve) => setTimeout(resolve, 140));
    return;
  }

  let settled = false;
  await Promise.race([
    tracked.then(() => {
      settled = true;
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 4500)),
  ]);

  if (!settled) {
    returnedOptimistically = true;
  }
}

export async function createShopProfile(
  uid: string,
  input: {
    shopName: string;
    shopSubtitle: string;
    phone: string;
    address: string;
    ownerEmail?: string;
    ownerName?: string;
    businessType?: string;
    nidNumber?: string;
    businessAgeYears?: string;
    photoUrl?: string;
    authMethod?: 'google' | 'manual';
  }
): Promise<void> {
  const path = `shops/${uid}`;
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid), {
      ownerUid: uid,
      ownerEmail: sanitizeStr(input.ownerEmail ?? '', 150),
      ownerName: sanitizeStr(input.ownerName ?? '', 100),
      shopName: sanitizeStr(input.shopName, 100) || 'মোনাফ টেলিকম',
      shopSubtitle: sanitizeStr(input.shopSubtitle, 120) || 'MUNAF SHOP',
      businessType: sanitizeStr(input.businessType ?? '', 80),
      nidNumber: sanitizeStr(input.nidNumber ?? '', 40),
      businessAgeYears: sanitizeStr(input.businessAgeYears ?? '', 20),
      photoUrl: sanitizePhotoUrl(input.photoUrl),
      authMethod: input.authMethod === 'manual' ? 'manual' : 'google',
      phone: sanitizeStr(input.phone, 30),
      supportPhone: SUPPORT_HELPLINE,
      address: sanitizeStr(input.address, 200),
      planTier: 'free',
      accountStatus: 'active',
      pinHash: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    path
  );
}

export async function syncShopOwnerEmail(uid: string, ownerEmail: string): Promise<void> {
  const cleanEmail = sanitizeStr(ownerEmail, 150);
  if (!cleanEmail) return;
  const path = `shops/${uid}`;
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid), {
      ownerEmail: cleanEmail,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    path
  );
}

export async function updateShopProfile(
  uid: string,
  input: {
    shopName: string;
    shopSubtitle: string;
    phone: string;
    address: string;
    ownerName?: string;
    businessType?: string;
    nidNumber?: string;
    businessAgeYears?: string;
    photoUrl?: string;
  }
): Promise<void> {
  const path = `shops/${uid}`;
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid), {
      shopName: sanitizeStr(input.shopName, 100) || 'মোনাফ টেলিকম',
      shopSubtitle: sanitizeStr(input.shopSubtitle, 120),
      ownerName: sanitizeStr(input.ownerName ?? '', 100),
      businessType: sanitizeStr(input.businessType ?? '', 80),
      nidNumber: sanitizeStr(input.nidNumber ?? '', 40),
      businessAgeYears: sanitizeStr(input.businessAgeYears ?? '', 20),
      photoUrl: sanitizePhotoUrl(input.photoUrl),
      phone: sanitizeStr(input.phone, 30),
      address: sanitizeStr(input.address, 200),
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    path
  );
}

export async function updateShopPin(uid: string, pinHash: string | null): Promise<void> {
  const path = `shops/${uid}`;
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid), {
      pinHash,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    path
  );
}

export async function createContactWithOptionalBalance(
  uid: string,
  input: {
    name: string;
    phone: string;
    contactType: ContactType;
    address: string;
    dueDate?: string;
    photoUrl?: string;
    smsAlertEnabled?: boolean;
    openingType?: KhataEntryType;
    openingAmount?: number;
    openingNote?: string;
    branchId?: string;
  }
): Promise<string> {
  const contactId = generateDocId('cnt');
  const contactRef = doc(db, 'shops', uid, 'contacts', contactId);
  const openingAmt =
    input.openingAmount && input.openingAmount > 0
      ? Math.min(100000000, Number(input.openingAmount))
      : 0;
  const signedOpening =
    openingAmt > 0
      ? input.openingType === 'pelam'
        ? -openingAmt
        : openingAmt
      : 0;
  const branchAttr = withOptionalBranch(input.branchId);

  try {
    const batch = writeBatch(db);
    const cleanName = sanitizeStr(input.name, 100);
    const cleanNote = sanitizeStr(
      input.openingNote || (openingAmt > 0 ? 'পূর্বের জের (Opening)' : ''),
      200
    );

    batch.set(contactRef, {
      ownerUid: uid,
      ...branchAttr,
      name: cleanName,
      phone: sanitizeStr(input.phone, 30),
      contactType: input.contactType,
      address: sanitizeStr(input.address, 200),
      photoUrl: sanitizePhotoUrl(input.photoUrl),
      smsAlertEnabled: input.smsAlertEnabled ?? true,
      balance: signedOpening,
      loyaltyPoints: 0,
      dueDate: sanitizeStr(input.dueDate ?? '', 10),
      lastNote: cleanNote,
      lastEntryAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (openingAmt > 0 && input.openingType) {
      const entryId = generateDocId('kht');
      const entryRef = doc(db, 'shops', uid, 'khataEntries', entryId);
      batch.set(entryRef, {
        ownerUid: uid,
        ...branchAttr,
        contactId,
        contactName: cleanName,
        entryType: input.openingType,
        amount: openingAmt,
        note: sanitizeStr(input.openingNote || 'পূর্বের জের (Opening)', 300),
        createdAt: serverTimestamp(),
      });
    }

    await commitWriteOfflineSafe(
      batch.commit(),
      OperationType.WRITE,
      `shops/${uid}/contacts/${contactId}`
    );
    return contactId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `shops/${uid}/contacts/${contactId}`);
  }
}

export async function updateContactDetails(
  uid: string,
  contactId: string,
  input: {
    name: string;
    phone: string;
    contactType: ContactType;
    address: string;
    dueDate?: string;
    photoUrl?: string;
    smsAlertEnabled?: boolean;
  }
): Promise<void> {
  const path = `shops/${uid}/contacts/${contactId}`;
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid, 'contacts', contactId), {
      name: sanitizeStr(input.name, 100),
      phone: sanitizeStr(input.phone, 30),
      contactType: input.contactType,
      address: sanitizeStr(input.address, 200),
      dueDate: sanitizeStr(input.dueDate ?? '', 10),
      photoUrl: sanitizePhotoUrl(input.photoUrl),
      smsAlertEnabled: input.smsAlertEnabled ?? true,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    path
  );
}

export async function deleteContactAndEntries(
  uid: string,
  contactId: string,
  entryIds: string[]
): Promise<void> {
  const path = `shops/${uid}/contacts/${contactId}`;
  const CHUNK_SIZE = 420;
  try {
    for (let i = 0; i < entryIds.length; i += CHUNK_SIZE) {
      const chunk = entryIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((eid) => {
        batch.delete(doc(db, 'shops', uid, 'khataEntries', eid));
      });
      await commitWriteOfflineSafe(
        batch.commit(),
        OperationType.DELETE,
        `shops/${uid}/khataEntries`
      );
    }

    await commitWriteOfflineSafe(
      deleteDoc(doc(db, 'shops', uid, 'contacts', contactId)),
      OperationType.DELETE,
      path
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addKhataTransaction(
  uid: string,
  contact: Contact,
  input: {
    entryType: KhataEntryType;
    amount: number;
    note: string;
    alsoRecordCash?: boolean;
    branchId?: string;
  }
): Promise<void> {
  const amt = Math.min(100000000, Math.max(0.01, Number(input.amount)));
  const delta = input.entryType === 'dilam' ? amt : -amt;
  const nextBalance = Number((contact.balance + delta).toFixed(2));
  const cleanNote = sanitizeStr(input.note, 300);
  const branchAttr = withOptionalBranch(input.branchId ?? contact.branchId);

  const entryId = generateDocId('kht');
  const contactRef = doc(db, 'shops', uid, 'contacts', contact.id);
  const entryRef = doc(db, 'shops', uid, 'khataEntries', entryId);

  const batch = writeBatch(db);
  batch.update(contactRef, {
    balance: nextBalance,
    lastNote: sanitizeStr(
      cleanNote || (input.entryType === 'dilam' ? 'দিলাম' : 'পেলাম'),
      200
    ),
    lastEntryAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(entryRef, {
    ownerUid: uid,
    ...branchAttr,
    contactId: contact.id,
    contactName: sanitizeStr(contact.name, 100),
    entryType: input.entryType,
    amount: amt,
    note: cleanNote,
    createdAt: serverTimestamp(),
  });

  if (input.alsoRecordCash) {
    const cashId = generateDocId('csh');
    const cashRef = doc(db, 'shops', uid, 'cashEntries', cashId);
    batch.set(cashRef, {
      ownerUid: uid,
      ...branchAttr,
      cashType: input.entryType === 'pelam' ? 'cash_in' : 'cash_out',
      category: input.entryType === 'pelam' ? 'বাকি আদায়' : 'নগদ প্রদান / পরিশোধ',
      amount: amt,
      note: sanitizeStr(`${contact.name}${cleanNote ? ` · ${cleanNote}` : ''}`, 300),
      createdAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/khataEntries/${entryId}`
  );
}

export async function deleteKhataTransaction(
  uid: string,
  contact: Contact,
  entry: KhataEntry
): Promise<void> {
  const reverseDelta = entry.entryType === 'dilam' ? -entry.amount : entry.amount;
  const nextBalance = Number((contact.balance + reverseDelta).toFixed(2));

  const contactRef = doc(db, 'shops', uid, 'contacts', contact.id);
  const entryRef = doc(db, 'shops', uid, 'khataEntries', entry.id);

  const batch = writeBatch(db);
  batch.delete(entryRef);
  batch.update(contactRef, {
    balance: nextBalance,
    lastNote: 'লেনদেন মুছে ফেলা হয়েছে',
    lastEntryAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.DELETE,
    `shops/${uid}/khataEntries/${entry.id}`
  );
}

export async function addCashEntry(
  uid: string,
  input: {
    cashType: CashType;
    category: string;
    amount: number;
    note: string;
    branchId?: string;
  }
): Promise<void> {
  const cashId = generateDocId('csh');
  const amt = Math.min(100000000, Math.max(0.01, Number(input.amount)));
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid, 'cashEntries', cashId), {
      ownerUid: uid,
      ...withOptionalBranch(input.branchId),
      cashType: input.cashType,
      category: sanitizeStr(input.category, 80) || 'অন্যান্য',
      amount: amt,
      note: sanitizeStr(input.note, 300),
      createdAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    `shops/${uid}/cashEntries/${cashId}`
  );
}

export async function deleteCashEntry(uid: string, cashId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'cashEntries', cashId)),
    OperationType.DELETE,
    `shops/${uid}/cashEntries/${cashId}`
  );
}

export async function saveProduct(
  uid: string,
  input: {
    name: string;
    code: string;
    category: string;
    purchasePrice: number;
    salePrice: number;
    quantity: number;
    lowStockThreshold: number;
    expiryDate?: string;
    branchId?: string;
  },
  existingId?: string
): Promise<void> {
  const productId = existingId || generateDocId('prd');
  const ref = doc(db, 'shops', uid, 'products', productId);
  if (existingId) {
    await commitWriteOfflineSafe(
      updateDoc(ref, {
        name: sanitizeStr(input.name, 120),
        code: sanitizeStr(input.code, 40).toUpperCase(),
        category: sanitizeStr(input.category, 60) || 'General',
        purchasePrice: Math.max(0, Number(input.purchasePrice) || 0),
        salePrice: Math.max(0, Number(input.salePrice) || 0),
        quantity: Math.max(0, Math.floor(Number(input.quantity) || 0)),
        lowStockThreshold: Math.max(0, Math.floor(Number(input.lowStockThreshold) || 0)),
        expiryDate: sanitizeStr(input.expiryDate ?? '', 10),
        updatedAt: serverTimestamp(),
      }),
      OperationType.UPDATE,
      `shops/${uid}/products/${productId}`
    );
  } else {
    await commitWriteOfflineSafe(
      setDoc(ref, {
        ownerUid: uid,
        ...withOptionalBranch(input.branchId),
        name: sanitizeStr(input.name, 120),
        code: sanitizeStr(input.code, 40).toUpperCase(),
        category: sanitizeStr(input.category, 60) || 'General',
        purchasePrice: Math.max(0, Number(input.purchasePrice) || 0),
        salePrice: Math.max(0, Number(input.salePrice) || 0),
        quantity: Math.max(0, Math.floor(Number(input.quantity) || 0)),
        lowStockThreshold: Math.max(0, Math.floor(Number(input.lowStockThreshold) || 0)),
        expiryDate: sanitizeStr(input.expiryDate ?? '', 10),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      OperationType.CREATE,
      `shops/${uid}/products/${productId}`
    );
  }
}

export async function adjustProductStock(
  uid: string,
  product: Product,
  delta: number
): Promise<void> {
  const nextQty = Math.max(0, product.quantity + delta);
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid, 'products', product.id), {
      quantity: nextQty,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    `shops/${uid}/products/${product.id}`
  );
}

export async function deleteProduct(uid: string, productId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'products', productId)),
    OperationType.DELETE,
    `shops/${uid}/products/${productId}`
  );
}

export async function recordQuickProductSale(
  uid: string,
  input: {
    product: Product;
    qty: number;
    unitPrice: number;
    saleMode: 'cash' | 'due';
    contact?: Contact;
    note: string;
    branchId?: string;
  }
): Promise<SaleInvoice> {
  return recordPosCartSale(uid, {
    cartItems: [
      {
        product: input.product,
        qty: input.qty,
        unitPrice: input.unitPrice,
      },
    ],
    discount: 0,
    paymentMode: input.saleMode,
    contact: input.contact,
    customerPhone: input.contact?.phone ?? '',
    note: input.note,
    branchId: input.branchId,
  });
}

export async function recordPosCartSale(
  uid: string,
  input: {
    cartItems: { product: Product; qty: number; unitPrice: number }[];
    discount: number;
    paymentMode: 'cash' | 'due';
    contact?: Contact;
    customerPhone?: string;
    redeemPoints?: number;
    note: string;
    branchId?: string;
  }
): Promise<SaleInvoice> {
  if (input.cartItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const branchAttr = withOptionalBranch(input.branchId);
  const batch = writeBatch(db);
  const items: SaleInvoiceItem[] = input.cartItems.slice(0, 50).map((ci) => {
    const qty = Math.max(1, Math.min(ci.product.quantity, Math.floor(ci.qty)));
    const unitPrice = Math.max(0, Number(ci.unitPrice) || 0);
    const lineTotal = Number((qty * unitPrice).toFixed(2));
    const nextStock = Math.max(0, ci.product.quantity - qty);

    batch.update(doc(db, 'shops', uid, 'products', ci.product.id), {
      quantity: nextStock,
      updatedAt: serverTimestamp(),
    });

    return {
      productId: ci.product.id,
      name: sanitizeStr(ci.product.name, 120),
      code: sanitizeStr(ci.product.code, 40),
      qty,
      unitPrice,
      purchasePrice: Math.max(0, Number(ci.product.purchasePrice) || 0),
      lineTotal,
    };
  });

  const subtotal = Number(items.reduce((s, it) => s + it.lineTotal, 0).toFixed(2));
  const rawDiscount = Math.max(0, Math.min(subtotal, Number(input.discount) || 0));
  const afterManualDiscount = Math.max(0, subtotal - rawDiscount);
  const availablePoints = Math.max(0, Math.floor(input.contact?.loyaltyPoints ?? 0));
  const loyaltyRedeemed = input.contact
    ? Math.max(
        0,
        Math.min(
          availablePoints,
          Math.floor(afterManualDiscount),
          Math.floor(Number(input.redeemPoints) || 0)
        )
      )
    : 0;
  const discount = Number((rawDiscount + loyaltyRedeemed).toFixed(2));
  const totalAmount = Number(Math.max(0, subtotal - discount).toFixed(2));
  const costTotal = Number(
    items.reduce((s, it) => s + it.purchasePrice * it.qty, 0).toFixed(2)
  );
  const profitAmount = Number((totalAmount - costTotal).toFixed(2));
  const loyaltyEarned = input.contact ? Math.floor(totalAmount / 100) : 0;
  const nextLoyaltyPoints = input.contact
    ? Math.min(
        10000000,
        Math.max(0, availablePoints - loyaltyRedeemed + loyaltyEarned)
      )
    : 0;

  const invoiceId = generateDocId('inv');
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
  const itemsSummary = items.map((i) => `${i.name} × ${i.qty}`).join(', ');
  const cleanNote = sanitizeStr(input.note || itemsSummary, 300);

  const invoicePayload: Record<string, unknown> = {
    ownerUid: uid,
    ...branchAttr,
    invoiceNo,
    items,
    subtotal,
    discount,
    totalAmount,
    costTotal,
    profitAmount,
    paymentMode: input.paymentMode,
    contactId: input.contact ? input.contact.id : '',
    contactName: input.contact ? sanitizeStr(input.contact.name, 100) : '',
    customerPhone: sanitizeStr(
      input.customerPhone || input.contact?.phone || '',
      30
    ),
    loyaltyEarned,
    loyaltyRedeemed,
    note: cleanNote,
    createdAt: serverTimestamp(),
  };

  batch.set(doc(db, 'shops', uid, 'invoices', invoiceId), invoicePayload);

  if (input.paymentMode === 'cash') {
    if (totalAmount > 0) {
      const cashId = generateDocId('csh');
      batch.set(doc(db, 'shops', uid, 'cashEntries', cashId), {
        ownerUid: uid,
        ...branchAttr,
        cashType: 'cash_in',
        category: 'নগদ বিক্রি',
        amount: totalAmount,
        note: sanitizeStr(`${invoiceNo} · ${cleanNote}`, 300),
        createdAt: serverTimestamp(),
      });
    }
    if (input.contact && (loyaltyEarned > 0 || loyaltyRedeemed > 0)) {
      batch.update(doc(db, 'shops', uid, 'contacts', input.contact.id), {
        loyaltyPoints: nextLoyaltyPoints,
        updatedAt: serverTimestamp(),
      });
    }
  } else if (input.paymentMode === 'due' && input.contact && totalAmount > 0) {
    const entryId = generateDocId('kht');
    const contactRef = doc(db, 'shops', uid, 'contacts', input.contact.id);
    batch.update(contactRef, {
      balance: Number((input.contact.balance + totalAmount).toFixed(2)),
      loyaltyPoints: nextLoyaltyPoints,
      lastNote: sanitizeStr(`${invoiceNo} · ${cleanNote}`, 200),
      lastEntryAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'shops', uid, 'khataEntries', entryId), {
      ownerUid: uid,
      ...branchAttr,
      contactId: input.contact.id,
      contactName: sanitizeStr(input.contact.name, 100),
      entryType: 'dilam',
      amount: totalAmount,
      note: sanitizeStr(`${invoiceNo} · ${cleanNote}`, 300),
      createdAt: serverTimestamp(),
    });
  } else if (input.contact && (loyaltyEarned > 0 || loyaltyRedeemed > 0)) {
    batch.update(doc(db, 'shops', uid, 'contacts', input.contact.id), {
      loyaltyPoints: nextLoyaltyPoints,
      updatedAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/invoices/${invoiceId}`
  );

  return {
    id: invoiceId,
    ownerUid: uid,
    ...branchAttr,
    invoiceNo,
    items,
    subtotal,
    discount,
    totalAmount,
    costTotal,
    profitAmount,
    paymentMode: input.paymentMode,
    contactId: input.contact?.id,
    contactName: input.contact?.name,
    customerPhone: input.customerPhone || input.contact?.phone || '',
    loyaltyEarned,
    loyaltyRedeemed,
    note: cleanNote,
    createdAt: Timestamp.now(),
  };
}

export async function deleteSaleInvoice(uid: string, invoiceId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'invoices', invoiceId)),
    OperationType.DELETE,
    `shops/${uid}/invoices/${invoiceId}`
  );
}

export async function addTelecomEntry(
  uid: string,
  input: {
    operator: TelecomOperator;
    serviceType: TelecomServiceType;
    customerPhone: string;
    amount: number;
    commission: number;
    paymentStatus: 'paid' | 'due';
    note: string;
    syncCashbook: boolean;
    branchId?: string;
  }
): Promise<void> {
  const txId = generateDocId('tel');
  const amt = Math.min(100000000, Math.max(1, Number(input.amount)));
  const comm = Math.min(10000000, Math.max(0, Number(input.commission) || 0));
  const branchAttr = withOptionalBranch(input.branchId);

  const batch = writeBatch(db);
  batch.set(doc(db, 'shops', uid, 'telecomEntries', txId), {
    ownerUid: uid,
    ...branchAttr,
    operator: input.operator,
    serviceType: input.serviceType,
    customerPhone: sanitizeStr(input.customerPhone, 30),
    amount: amt,
    commission: comm,
    paymentStatus: input.paymentStatus,
    note: sanitizeStr(input.note, 200),
    createdAt: serverTimestamp(),
  });

  if (input.syncCashbook && input.paymentStatus === 'paid') {
    const cashId = generateDocId('csh');
    const isOut = input.serviceType === 'cash_out';
    batch.set(doc(db, 'shops', uid, 'cashEntries', cashId), {
      ownerUid: uid,
      ...branchAttr,
      cashType: isOut ? 'cash_out' : 'cash_in',
      category: `${input.operator} · ${input.serviceType.replace('_', ' ')}`,
      amount: amt + (isOut ? 0 : comm),
      note: sanitizeStr(
        `${input.customerPhone || 'Walk-in'}${input.note ? ` · ${input.note}` : ''}`,
        300
      ),
      createdAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/telecomEntries/${txId}`
  );
}

export async function deleteTelecomEntry(uid: string, txId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'telecomEntries', txId)),
    OperationType.DELETE,
    `shops/${uid}/telecomEntries/${txId}`
  );
}

export async function createSupportTicket(
  uid: string,
  input: { subject: string; category: string; message: string; contactPhone: string }
): Promise<void> {
  const ticketId = generateDocId('tkt');
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid, 'supportTickets', ticketId), {
      ownerUid: uid,
      subject: sanitizeStr(input.subject, 120),
      category: sanitizeStr(input.category, 60) || 'সাধারণ সহায়তা',
      message: sanitizeStr(input.message, 500),
      contactPhone: sanitizeStr(input.contactPhone, 30),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    `shops/${uid}/supportTickets/${ticketId}`
  );
}

export async function updateSupportTicketStatus(
  uid: string,
  ticketId: string,
  status: 'pending' | 'resolved'
): Promise<void> {
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid, 'supportTickets', ticketId), {
      status,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    `shops/${uid}/supportTickets/${ticketId}`
  );
}

export async function createComplaint(
  uid: string,
  input: {
    title: string;
    category: string;
    severity: ComplaintSeverity;
    referenceInfo?: string;
    description: string;
    contactPhone: string;
  }
): Promise<void> {
  const complaintId = generateDocId('cmp');
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid, 'complaints', complaintId), {
      ownerUid: uid,
      title: sanitizeStr(input.title, 120),
      category: sanitizeStr(input.category, 60) || 'অন্যান্য অভিযোগ',
      severity: input.severity,
      referenceInfo: sanitizeStr(input.referenceInfo ?? '', 80),
      description: sanitizeStr(input.description, 600),
      contactPhone: sanitizeStr(input.contactPhone, 30),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    `shops/${uid}/complaints/${complaintId}`
  );
}

export async function updateComplaintUserStatus(
  uid: string,
  complaintId: string,
  status: 'pending' | 'resolved'
): Promise<void> {
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', uid, 'complaints', complaintId), {
      status,
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    `shops/${uid}/complaints/${complaintId}`
  );
}

export async function adminUpdateComplaint(
  ownerUid: string,
  complaintId: string,
  input: {
    status: ComplaintStatus;
    adminReply?: string;
    statusReason?: string;
  }
): Promise<void> {
  const cleanReply = sanitizeStr(input.adminReply ?? '', 500);
  const cleanReason = sanitizeStr(input.statusReason ?? '', 300);
  const payload: Record<string, unknown> = {
    status: input.status,
    adminReply: cleanReply,
    statusReason: cleanReason,
    updatedAt: serverTimestamp(),
  };
  if (cleanReply.length > 0) {
    payload.repliedAt = serverTimestamp();
  }
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', ownerUid, 'complaints', complaintId), payload),
    OperationType.UPDATE,
    `shops/${ownerUid}/complaints/${complaintId}`
  );
}

export async function submitUpgradeRequest(
  uid: string,
  input: {
    planTier: 'pro' | 'business' | 'catalog';
    catalogTitle?: string;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    paymentMethod: PaymentGatewayId;
    senderNumber: string;
    trxId: string;
  }
): Promise<void> {
  const requestId = generateDocId('upg');
  const payload: Record<string, unknown> = {
    ownerUid: uid,
    planTier: input.planTier,
    billingCycle: input.billingCycle,
    amount: Math.min(10000000, Math.max(0, Number(input.amount) || 0)),
    paymentMethod: input.paymentMethod,
    senderNumber: sanitizeStr(input.senderNumber, 30),
    trxId: sanitizeStr(input.trxId, 60).toUpperCase(),
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  if (input.catalogTitle) {
    payload.catalogTitle = sanitizeStr(input.catalogTitle, 120);
  }
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid, 'upgradeRequests', requestId), payload),
    OperationType.CREATE,
    `shops/${uid}/upgradeRequests/${requestId}`
  );
}

export interface AdminUpdateShopPlanInput {
  planTier: PlanTier;
  billingCycle?: 'monthly' | 'yearly';
  startedAtMs?: number;
  expiresAtMs?: number;
  durationDays?: number;
}

export async function adminUpdateShopPlan(
  ownerUid: string,
  input: PlanTier | AdminUpdateShopPlanInput
): Promise<void> {
  const opts: AdminUpdateShopPlanInput =
    typeof input === 'string' ? { planTier: input } : input;

  if (opts.planTier === 'free') {
    await commitWriteOfflineSafe(
      updateDoc(doc(db, 'shops', ownerUid), {
        planTier: 'free',
        planBillingCycle: null,
        planStartedAt: null,
        planExpiresAt: null,
        updatedAt: serverTimestamp(),
      }),
      OperationType.UPDATE,
      `shops/${ownerUid}`
    );
    return;
  }

  const cycle: 'monthly' | 'yearly' = opts.billingCycle ?? 'monthly';
  const startMs = opts.startedAtMs ?? Date.now();
  const defaultDays = cycle === 'yearly' ? 365 : 30;
  const days = opts.durationDays ?? defaultDays;
  const endMs = opts.expiresAtMs ?? startMs + days * 86400_000;

  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', ownerUid), {
      planTier: opts.planTier,
      planBillingCycle: cycle,
      planStartedAt: Timestamp.fromMillis(startMs),
      planExpiresAt: Timestamp.fromMillis(Math.max(startMs + 60_000, endMs)),
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    `shops/${ownerUid}`
  );
}

export async function adminUpdateShopAccountStatus(
  ownerUid: string,
  input: {
    accountStatus: AccountStatus;
    banReason?: string;
    adminEmail?: string;
  }
): Promise<void> {
  const isActive = input.accountStatus === 'active';
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', ownerUid), {
      accountStatus: input.accountStatus,
      banReason: isActive ? '' : sanitizeStr(input.banReason ?? '', 300),
      bannedAt: isActive ? null : serverTimestamp(),
      bannedBy: isActive ? '' : sanitizeStr(input.adminEmail ?? '', 150),
      updatedAt: serverTimestamp(),
    }),
    OperationType.UPDATE,
    `shops/${ownerUid}`
  );
}

export async function adminSavePlatformPricing(input: {
  proMonthly: number;
  proYearly: number;
  businessMonthly: number;
  businessYearly: number;
  discountNote?: string;
}): Promise<void> {
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'platformConfig', 'pricing'), {
      proMonthly: Math.min(1000000, Math.max(0, Math.round(Number(input.proMonthly) || 0))),
      proYearly: Math.min(10000000, Math.max(0, Math.round(Number(input.proYearly) || 0))),
      businessMonthly: Math.min(1000000, Math.max(0, Math.round(Number(input.businessMonthly) || 0))),
      businessYearly: Math.min(10000000, Math.max(0, Math.round(Number(input.businessYearly) || 0))),
      discountNote: sanitizeStr(input.discountNote ?? '', 120),
      updatedAt: serverTimestamp(),
    }),
    OperationType.WRITE,
    'platformConfig/pricing'
  );
}

export async function adminSavePaymentGateways(
  input: Omit<PaymentGatewaysConfig, 'updatedAt'>
): Promise<void> {
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'platformConfig', 'gateways'), {
      bkashNumber: sanitizeStr(input.bkashNumber, 30),
      bkashType: input.bkashType,
      bkashEnabled: Boolean(input.bkashEnabled),
      bkashNote: sanitizeStr(input.bkashNote ?? '', 150),
      bkashPaymentLink: normalizeSafePaymentUrl(input.bkashPaymentLink),
      nagadNumber: sanitizeStr(input.nagadNumber, 30),
      nagadType: input.nagadType,
      nagadEnabled: Boolean(input.nagadEnabled),
      nagadNote: sanitizeStr(input.nagadNote ?? '', 150),
      rocketNumber: sanitizeStr(input.rocketNumber, 30),
      rocketType: input.rocketType,
      rocketEnabled: Boolean(input.rocketEnabled),
      rocketNote: sanitizeStr(input.rocketNote ?? '', 150),
      upayNumber: sanitizeStr(input.upayNumber, 30),
      upayType: input.upayType,
      upayEnabled: Boolean(input.upayEnabled),
      upayNote: sanitizeStr(input.upayNote ?? '', 150),
      gpayNumber: sanitizeStr(input.gpayNumber, 60),
      gpayType: input.gpayType,
      gpayEnabled: Boolean(input.gpayEnabled),
      gpayNote: sanitizeStr(input.gpayNote ?? '', 150),
      updatedAt: serverTimestamp(),
    }),
    OperationType.WRITE,
    'platformConfig/gateways'
  );
}

export async function adminSaveCatalogItem(
  input: {
    title: string;
    category: string;
    price: number;
    unitLabel?: string;
    description?: string;
    features?: string;
    accentColor: CatalogAccentColor;
    enabled: boolean;
    sortOrder: number;
  },
  existingId?: string
): Promise<void> {
  const itemId = existingId || generateDocId('cat');
  const ref = doc(db, 'catalogItems', itemId);
  const price = Math.min(10000000, Math.max(0, Math.round(Number(input.price) || 0)));
  const sortOrder = Math.min(100000, Math.max(0, Math.round(Number(input.sortOrder) || 0)));

  if (existingId) {
    await commitWriteOfflineSafe(
      updateDoc(ref, {
        title: sanitizeStr(input.title, 100),
        category: sanitizeStr(input.category, 60) || 'সার্ভিস',
        price,
        unitLabel: sanitizeStr(input.unitLabel ?? '', 40),
        description: sanitizeStr(input.description ?? '', 240),
        features: sanitizeStr(input.features ?? '', 400),
        accentColor: input.accentColor,
        enabled: Boolean(input.enabled),
        isPublic: true,
        sortOrder,
        updatedAt: serverTimestamp(),
      }),
      OperationType.UPDATE,
      `catalogItems/${itemId}`
    );
  } else {
    await commitWriteOfflineSafe(
      setDoc(ref, {
        title: sanitizeStr(input.title, 100),
        category: sanitizeStr(input.category, 60) || 'সার্ভিস',
        price,
        unitLabel: sanitizeStr(input.unitLabel ?? '', 40),
        description: sanitizeStr(input.description ?? '', 240),
        features: sanitizeStr(input.features ?? '', 400),
        accentColor: input.accentColor,
        enabled: Boolean(input.enabled),
        isPublic: true,
        sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      OperationType.CREATE,
      `catalogItems/${itemId}`
    );
  }
}

export async function adminDeleteCatalogItem(itemId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'catalogItems', itemId)),
    OperationType.DELETE,
    `catalogItems/${itemId}`
  );
}

export async function adminApproveUpgradeRequest(
  req: UpgradeRequest,
  nextStatus: UpgradeRequestStatus,
  statusReason = '',
  customRange?: { startedAtMs?: number; expiresAtMs?: number }
): Promise<void> {
  const batch = writeBatch(db);
  const reqRef = doc(db, 'shops', req.ownerUid, 'upgradeRequests', req.id);
  const shopRef = doc(db, 'shops', req.ownerUid);

  if (nextStatus === 'active') {
    const startMs = customRange?.startedAtMs ?? Date.now();
    const days = req.billingCycle === 'yearly' ? 365 : 30;
    const endMs = customRange?.expiresAtMs ?? startMs + days * 86400_000;
    const startTs = Timestamp.fromMillis(startMs);
    const endTs = Timestamp.fromMillis(Math.max(startMs + 60_000, endMs));

    batch.update(reqRef, {
      status: 'active',
      statusReason: sanitizeStr(statusReason, 300),
      startedAt: startTs,
      expiresAt: endTs,
      updatedAt: serverTimestamp(),
    });
    if (req.planTier === 'pro' || req.planTier === 'business') {
      batch.update(shopRef, {
        planTier: req.planTier,
        planBillingCycle: req.billingCycle,
        planStartedAt: startTs,
        planExpiresAt: endTs,
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    batch.update(reqRef, {
      status: nextStatus,
      statusReason: sanitizeStr(statusReason, 300),
      ...(req.status === 'active' ? { startedAt: null, expiresAt: null } : {}),
      updatedAt: serverTimestamp(),
    });
    if (req.status === 'active' && (req.planTier === 'pro' || req.planTier === 'business')) {
      batch.update(shopRef, {
        planTier: 'free',
        planBillingCycle: null,
        planStartedAt: null,
        planExpiresAt: null,
        updatedAt: serverTimestamp(),
      });
    }
  }
  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${req.ownerUid}/upgradeRequests/${req.id}`
  );
}

export async function adminUpdateSupportTicket(
  ownerUid: string,
  ticketId: string,
  input: {
    status: Exclude<SupportTicketStatus, 'open'>;
    adminReply?: string;
    statusReason?: string;
  }
): Promise<void> {
  const cleanReply = sanitizeStr(input.adminReply ?? '', 500);
  const cleanReason = sanitizeStr(input.statusReason ?? '', 300);
  const payload: Record<string, unknown> = {
    status: input.status,
    adminReply: cleanReply,
    statusReason: cleanReason,
    updatedAt: serverTimestamp(),
  };
  if (cleanReply.length > 0) {
    payload.repliedAt = serverTimestamp();
  }
  await commitWriteOfflineSafe(
    updateDoc(doc(db, 'shops', ownerUid, 'supportTickets', ticketId), payload),
    OperationType.UPDATE,
    `shops/${ownerUid}/supportTickets/${ticketId}`
  );
}

export async function adminAddSubAdmin(
  adminUid: string,
  email: string
): Promise<void> {
  const cleanUid = sanitizeStr(adminUid, 128);
  const cleanEmail = sanitizeStr(email, 150).toLowerCase();
  if (!cleanUid || !cleanEmail) return;
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: cleanEmail,
      role: 'admin',
      createdAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    `admins/${cleanUid}`
  );
}

export async function adminRemoveSubAdmin(adminUid: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'admins', adminUid)),
    OperationType.DELETE,
    `admins/${adminUid}`
  );
}

export async function adminSaveAppUpdateConfig(
  input: {
    latestVersionName: string;
    latestVersionCode: number;
    minSupportedVersionCode: number;
    apkDownloadUrl: string;
    updateDescription: string;
    forceUpdate: boolean;
  },
  ownerIdToken?: string
): Promise<void> {
  const latestVersionCode = Math.max(
    1,
    Math.min(1000000, Math.round(Number(input.latestVersionCode) || 1))
  );
  const minSupportedVersionCode = Math.max(
    1,
    Math.min(
      latestVersionCode,
      Math.round(Number(input.minSupportedVersionCode) || latestVersionCode)
    )
  );
  const cleanName = sanitizeStr(input.latestVersionName, 40) || '1.0.0';
  const cleanUrl = normalizeSafeUpdateUrl(input.apkDownloadUrl);
  const cleanDesc = sanitizeStr(input.updateDescription, 800);

  if (input.forceUpdate && !cleanUrl) {
    throw new Error('Mandatory update requires a valid APK download link (https:// or http://).');
  }

  await commitWriteOfflineSafe(
    setDoc(doc(db, 'platformConfig', 'appUpdate'), {
      latestVersionName: cleanName,
      latestVersionCode,
      minSupportedVersionCode,
      apkDownloadUrl: cleanUrl,
      updateDescription: cleanDesc,
      forceUpdate: Boolean(input.forceUpdate),
      publishedBy: 'Owner',
      updatedAt: serverTimestamp(),
    }),
    OperationType.WRITE,
    'platformConfig/appUpdate'
  );

  if (ownerIdToken) {
    try {
      await fetch('/api/app-update/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerIdToken}`,
          'X-Admin-Portal': '1',
          ...getAppVersionHeaders(),
        },
      });
    } catch {
      // Server cache automatically refreshes within TTL
    }
  }
}

export async function sendOrderNotificationEmail(
  idToken: string,
  payload: {
    shopName: string;
    shopPhone: string;
    customerEmail: string;
    planTitle: string;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    paymentMethod: PaymentGatewayId;
    senderNumber: string;
    trxId: string;
  }
): Promise<void> {
  if (!idToken) return;
  try {
    const res = await fetch('/api/notify-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...getAppVersionHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 426) {
      try {
        const errJson = (await res.json()) as { policy?: Partial<AppUpdateConfig> };
        notifyServerForcedUpdate(errJson.policy);
      } catch {
        notifyServerForcedUpdate();
      }
    }
  } catch {
    // Non-blocking: never fail an order submission if email network call fails
  }
}

export async function sendComplaintNotificationEmail(
  idToken: string,
  payload: {
    kind: 'complaint' | 'ticket';
    shopName: string;
    customerEmail: string;
    contactPhone: string;
    title: string;
    category: string;
    severity?: ComplaintSeverity;
    referenceInfo?: string;
    details: string;
  }
): Promise<void> {
  if (!idToken) return;
  try {
    const res = await fetch('/api/notify-complaint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...getAppVersionHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 426) {
      try {
        const errJson = (await res.json()) as { policy?: Partial<AppUpdateConfig> };
        notifyServerForcedUpdate(errJson.policy);
      } catch {
        notifyServerForcedUpdate();
      }
    }
  } catch {
    // Non-blocking: never fail complaint/ticket submission if email call fails
  }
}

// ---------- Feature 8: Multi-Shop / Branch Management ----------
export async function saveShopBranch(
  uid: string,
  input: {
    name: string;
    address?: string;
    phone?: string;
    businessType?: string;
    isDefault?: boolean;
  },
  existingId?: string
): Promise<string> {
  const branchId = existingId || generateDocId('brn');
  const ref = doc(db, 'shops', uid, 'branches', branchId);
  if (existingId) {
    await commitWriteOfflineSafe(
      updateDoc(ref, {
        name: sanitizeStr(input.name, 100),
        address: sanitizeStr(input.address ?? '', 200),
        phone: sanitizeStr(input.phone ?? '', 30),
        businessType: sanitizeStr(input.businessType ?? '', 80),
        isDefault: Boolean(input.isDefault),
        updatedAt: serverTimestamp(),
      }),
      OperationType.UPDATE,
      `shops/${uid}/branches/${branchId}`
    );
  } else {
    await commitWriteOfflineSafe(
      setDoc(ref, {
        ownerUid: uid,
        name: sanitizeStr(input.name, 100),
        address: sanitizeStr(input.address ?? '', 200),
        phone: sanitizeStr(input.phone ?? '', 30),
        businessType: sanitizeStr(input.businessType ?? '', 80),
        isDefault: Boolean(input.isDefault),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      OperationType.CREATE,
      `shops/${uid}/branches/${branchId}`
    );
  }
  return branchId;
}

export async function deleteShopBranch(uid: string, branchId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'branches', branchId)),
    OperationType.DELETE,
    `shops/${uid}/branches/${branchId}`
  );
}

// ---------- Feature 1: Installment (কিস্তি / EMI) Management ----------
export async function createInstallmentPlan(
  uid: string,
  input: {
    contact?: Contact;
    contactName: string;
    customerPhone?: string;
    itemTitle: string;
    totalAmount: number;
    downPayment: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly';
    nextDueDate: string;
    note?: string;
    alsoRecordCashDownPayment?: boolean;
    branchId?: string;
  }
): Promise<string> {
  const planId = generateDocId('ins');
  const totalAmount = Math.min(100000000, Math.max(1, Number(input.totalAmount) || 0));
  const downPayment = Math.min(totalAmount, Math.max(0, Number(input.downPayment) || 0));
  const installmentCount = Math.min(120, Math.max(1, Math.floor(Number(input.installmentCount) || 1)));
  const remainingAmount = Number(Math.max(0, totalAmount - downPayment).toFixed(2));
  const installmentAmount = Number(
    Math.max(1, (remainingAmount > 0 ? remainingAmount : totalAmount) / installmentCount).toFixed(2)
  );
  const status: 'active' | 'completed' = remainingAmount <= 0 ? 'completed' : 'active';
  const branchAttr = withOptionalBranch(input.branchId ?? input.contact?.branchId);

  const batch = writeBatch(db);
  batch.set(doc(db, 'shops', uid, 'installments', planId), {
    ownerUid: uid,
    ...branchAttr,
    contactId: input.contact?.id ?? '',
    contactName: sanitizeStr(input.contact?.name || input.contactName, 100),
    customerPhone: sanitizeStr(input.customerPhone || input.contact?.phone || '', 30),
    itemTitle: sanitizeStr(input.itemTitle, 120),
    totalAmount,
    downPayment,
    installmentCount,
    paidCount: 0,
    installmentAmount,
    frequency: input.frequency,
    nextDueDate: normalizeIsoDate(input.nextDueDate),
    remainingAmount,
    status,
    note: sanitizeStr(input.note ?? '', 300),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.alsoRecordCashDownPayment && downPayment > 0) {
    const cashId = generateDocId('csh');
    batch.set(doc(db, 'shops', uid, 'cashEntries', cashId), {
      ownerUid: uid,
      ...branchAttr,
      cashType: 'cash_in',
      category: 'কিস্তি ডাউন পেমেন্ট',
      amount: downPayment,
      note: sanitizeStr(`${input.contactName} · ${input.itemTitle}`, 300),
      createdAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/installments/${planId}`
  );
  return planId;
}

export async function recordInstallmentPayment(
  uid: string,
  plan: InstallmentPlan,
  input: {
    amount: number;
    note?: string;
    alsoRecordCash?: boolean;
  }
): Promise<void> {
  if (plan.status !== 'active') return;
  const paidAmt = Math.min(plan.remainingAmount, Math.max(0.01, Number(input.amount) || 0));
  const nextRemaining = Number(Math.max(0, plan.remainingAmount - paidAmt).toFixed(2));
  const nextPaidCount = Math.min(plan.installmentCount, plan.paidCount + 1);
  const nextStatus: 'active' | 'completed' = nextRemaining <= 0.01 ? 'completed' : 'active';
  const nextDue =
    nextStatus === 'completed'
      ? normalizeIsoDate(plan.nextDueDate)
      : shiftIsoDueDate(plan.nextDueDate, plan.frequency);
  const branchAttr = withOptionalBranch(plan.branchId);

  const batch = writeBatch(db);
  batch.update(doc(db, 'shops', uid, 'installments', plan.id), {
    paidCount: nextPaidCount,
    nextDueDate: nextDue,
    remainingAmount: nextStatus === 'completed' ? 0 : nextRemaining,
    status: nextStatus,
    note: sanitizeStr(input.note ?? plan.note ?? '', 300),
    updatedAt: serverTimestamp(),
  });

  if (input.alsoRecordCash !== false && paidAmt > 0) {
    const cashId = generateDocId('csh');
    batch.set(doc(db, 'shops', uid, 'cashEntries', cashId), {
      ownerUid: uid,
      ...branchAttr,
      cashType: 'cash_in',
      category: 'কিস্তি আদায়',
      amount: paidAmt,
      note: sanitizeStr(
        `${plan.contactName} · ${plan.itemTitle} (${nextPaidCount}/${plan.installmentCount})`,
        300
      ),
      createdAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/installments/${plan.id}`
  );
}

export async function deleteInstallmentPlan(uid: string, planId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'installments', planId)),
    OperationType.DELETE,
    `shops/${uid}/installments/${planId}`
  );
}

// ---------- Feature 5: Supplier Purchase Order & Auto Stock Restock ----------
export async function createPurchaseOrder(
  uid: string,
  input: {
    supplier?: Contact;
    supplierName: string;
    supplierPhone?: string;
    invoiceRef?: string;
    items: { product: Product; qty: number; unitCost: number }[];
    paymentMode: 'cash' | 'due';
    note?: string;
    branchId?: string;
  }
): Promise<string> {
  if (input.items.length === 0) {
    throw new Error('Add at least one product to the purchase order.');
  }
  const poId = generateDocId('po');
  const branchAttr = withOptionalBranch(input.branchId);
  const batch = writeBatch(db);

  const poItems: PurchaseOrderItem[] = input.items.slice(0, 50).map((row) => {
    const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
    const unitCost = Math.max(0, Number(row.unitCost) || 0);
    const lineTotal = Number((qty * unitCost).toFixed(2));
    const nextQty = Math.max(0, row.product.quantity + qty);

    batch.update(doc(db, 'shops', uid, 'products', row.product.id), {
      quantity: nextQty,
      purchasePrice: unitCost,
      updatedAt: serverTimestamp(),
    });

    return {
      productId: row.product.id,
      name: sanitizeStr(row.product.name, 120),
      code: sanitizeStr(row.product.code, 40),
      qty,
      unitCost,
      lineTotal,
    };
  });

  const totalAmount = Number(
    poItems.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2)
  );
  if (totalAmount <= 0) {
    throw new Error('Purchase total amount must be greater than 0.');
  }

  const cleanSupplierName = sanitizeStr(
    input.supplier?.name || input.supplierName,
    100
  );
  const cleanNote = sanitizeStr(
    input.note || `${input.invoiceRef ? `${input.invoiceRef} · ` : ''}${poItems.map((i) => `${i.name} × ${i.qty}`).join(', ')}`,
    300
  );

  batch.set(doc(db, 'shops', uid, 'purchaseOrders', poId), {
    ownerUid: uid,
    ...branchAttr,
    supplierId: input.supplier?.id ?? '',
    supplierName: cleanSupplierName,
    supplierPhone: sanitizeStr(
      input.supplierPhone || input.supplier?.phone || '',
      30
    ),
    invoiceRef: sanitizeStr(input.invoiceRef ?? '', 50),
    items: poItems,
    totalAmount,
    paymentMode: input.paymentMode,
    note: cleanNote,
    createdAt: serverTimestamp(),
  });

  if (input.paymentMode === 'cash') {
    const cashId = generateDocId('csh');
    batch.set(doc(db, 'shops', uid, 'cashEntries', cashId), {
      ownerUid: uid,
      ...branchAttr,
      cashType: 'cash_out',
      category: 'ক্যাশ কেনা',
      amount: totalAmount,
      note: sanitizeStr(`PO: ${cleanSupplierName} · ${cleanNote}`, 300),
      createdAt: serverTimestamp(),
    });
  } else if (input.paymentMode === 'due' && input.supplier) {
    const entryId = generateDocId('kht');
    batch.update(doc(db, 'shops', uid, 'contacts', input.supplier.id), {
      balance: Number((input.supplier.balance - totalAmount).toFixed(2)),
      lastNote: sanitizeStr(`PO বাকি ক্রয় · ${cleanNote}`, 200),
      lastEntryAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'shops', uid, 'khataEntries', entryId), {
      ownerUid: uid,
      ...branchAttr,
      contactId: input.supplier.id,
      contactName: cleanSupplierName,
      entryType: 'pelam',
      amount: totalAmount,
      note: sanitizeStr(`PO ক্রয়: ${cleanNote}`, 300),
      createdAt: serverTimestamp(),
    });
  }

  await commitWriteOfflineSafe(
    batch.commit(),
    OperationType.WRITE,
    `shops/${uid}/purchaseOrders/${poId}`
  );
  return poId;
}

export async function deletePurchaseOrder(uid: string, poId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'purchaseOrders', poId)),
    OperationType.DELETE,
    `shops/${uid}/purchaseOrders/${poId}`
  );
}

// ---------- Feature 2: Staff Management & Daily Shift Cash Closing ----------
export async function saveStaffMember(
  uid: string,
  input: {
    name: string;
    phone?: string;
    role: StaffRole;
    pinHash: string;
    canViewProfit: boolean;
    canDeleteRecords: boolean;
    active: boolean;
    branchId?: string;
  },
  existingId?: string
): Promise<string> {
  const staffId = existingId || generateDocId('stf');
  const ref = doc(db, 'shops', uid, 'staffMembers', staffId);
  if (existingId) {
    await commitWriteOfflineSafe(
      updateDoc(ref, {
        name: sanitizeStr(input.name, 100),
        phone: sanitizeStr(input.phone ?? '', 30),
        role: input.role,
        pinHash: input.pinHash,
        canViewProfit: Boolean(input.canViewProfit),
        canDeleteRecords: Boolean(input.canDeleteRecords),
        active: Boolean(input.active),
        updatedAt: serverTimestamp(),
      }),
      OperationType.UPDATE,
      `shops/${uid}/staffMembers/${staffId}`
    );
  } else {
    await commitWriteOfflineSafe(
      setDoc(ref, {
        ownerUid: uid,
        ...withOptionalBranch(input.branchId),
        name: sanitizeStr(input.name, 100),
        phone: sanitizeStr(input.phone ?? '', 30),
        role: input.role,
        pinHash: input.pinHash,
        canViewProfit: Boolean(input.canViewProfit),
        canDeleteRecords: Boolean(input.canDeleteRecords),
        active: Boolean(input.active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      OperationType.CREATE,
      `shops/${uid}/staffMembers/${staffId}`
    );
  }
  return staffId;
}

export async function toggleStaffActive(
  uid: string,
  staff: StaffMember
): Promise<void> {
  await saveStaffMember(
    uid,
    {
      name: staff.name,
      phone: staff.phone ?? '',
      role: staff.role,
      pinHash: staff.pinHash,
      canViewProfit: staff.canViewProfit,
      canDeleteRecords: staff.canDeleteRecords,
      active: !staff.active,
      branchId: staff.branchId,
    },
    staff.id
  );
}

export async function deleteStaffMember(uid: string, staffId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'staffMembers', staffId)),
    OperationType.DELETE,
    `shops/${uid}/staffMembers/${staffId}`
  );
}

export async function createShiftClosing(
  uid: string,
  input: {
    staffName: string;
    shiftLabel: string;
    openingCash: number;
    cashInTotal: number;
    cashOutTotal: number;
    expectedClosing: number;
    actualCashCount: number;
    variance: number;
    note?: string;
    branchId?: string;
  }
): Promise<string> {
  const shiftId = generateDocId('shf');
  await commitWriteOfflineSafe(
    setDoc(doc(db, 'shops', uid, 'shiftClosings', shiftId), {
      ownerUid: uid,
      ...withOptionalBranch(input.branchId),
      staffName: sanitizeStr(input.staffName, 100) || 'Owner',
      shiftLabel: sanitizeStr(input.shiftLabel, 60) || 'Day Shift',
      openingCash: Number(input.openingCash) || 0,
      cashInTotal: Math.max(0, Number(input.cashInTotal) || 0),
      cashOutTotal: Math.max(0, Number(input.cashOutTotal) || 0),
      expectedClosing: Number(input.expectedClosing) || 0,
      actualCashCount: Math.max(0, Number(input.actualCashCount) || 0),
      variance: Number(input.variance) || 0,
      note: sanitizeStr(input.note ?? '', 300),
      createdAt: serverTimestamp(),
    }),
    OperationType.CREATE,
    `shops/${uid}/shiftClosings/${shiftId}`
  );
  return shiftId;
}

export async function deleteShiftClosing(uid: string, shiftId: string): Promise<void> {
  await commitWriteOfflineSafe(
    deleteDoc(doc(db, 'shops', uid, 'shiftClosings', shiftId)),
    OperationType.DELETE,
    `shops/${uid}/shiftClosings/${shiftId}`
  );
}
