import { Timestamp } from 'firebase/firestore';

export type Locale = 'bn' | 'en';

export type PlanTier = 'free' | 'pro' | 'business';
export type AccountStatus = 'active' | 'blocked' | 'banned';
export type ContactType = 'customer' | 'supplier';
export type KhataEntryType = 'dilam' | 'pelam';
export type CashType = 'cash_in' | 'cash_out';

export type PaymentGatewayId = 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'GPay';
export type PaymentAccountType = 'personal' | 'agent' | 'merchant' | 'gpay';

export type TelecomOperator =
  | 'Grameenphone'
  | 'Robi'
  | 'Banglalink'
  | 'Teletalk'
  | 'bKash'
  | 'Nagad'
  | 'Rocket'
  | 'Upay'
  | 'GPay'
  | 'Other';

export type TelecomServiceType =
  | 'recharge'
  | 'cash_in'
  | 'cash_out'
  | 'send_money'
  | 'sim_sale';

export interface ShopProfile {
  ownerUid: string;
  ownerEmail?: string;
  ownerName?: string;
  shopName: string;
  shopSubtitle: string;
  businessType?: string;
  nidNumber?: string;
  businessAgeYears?: string;
  photoUrl?: string;
  authMethod?: 'google' | 'manual';
  phone: string;
  supportPhone?: string;
  address: string;
  planTier?: PlanTier;
  planBillingCycle?: 'monthly' | 'yearly' | null;
  planStartedAt?: Timestamp | null;
  planExpiresAt?: Timestamp | null;
  accountStatus?: AccountStatus;
  banReason?: string;
  bannedAt?: Timestamp | null;
  bannedBy?: string;
  pinHash: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PlanPricingConfig {
  proMonthly: number;
  proYearly: number;
  businessMonthly: number;
  businessYearly: number;
  discountNote?: string;
  updatedAt?: Timestamp | null;
}

export interface PaymentGatewaysConfig {
  bkashNumber: string;
  bkashType: PaymentAccountType;
  bkashEnabled: boolean;
  bkashNote?: string;
  bkashPaymentLink?: string;
  nagadNumber: string;
  nagadType: PaymentAccountType;
  nagadEnabled: boolean;
  nagadNote?: string;
  rocketNumber: string;
  rocketType: PaymentAccountType;
  rocketEnabled: boolean;
  rocketNote?: string;
  upayNumber: string;
  upayType: PaymentAccountType;
  upayEnabled: boolean;
  upayNote?: string;
  gpayNumber: string;
  gpayType: PaymentAccountType;
  gpayEnabled: boolean;
  gpayNote?: string;
  updatedAt?: Timestamp | null;
}

export type CatalogAccentColor = 'crimson' | 'emerald' | 'sky' | 'amber' | 'violet';

export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  price: number;
  unitLabel?: string;
  description?: string;
  features?: string;
  accentColor: CatalogAccentColor;
  enabled: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Contact {
  id: string;
  ownerUid: string;
  branchId?: string;
  name: string;
  phone: string;
  contactType: ContactType;
  address: string;
  photoUrl?: string;
  smsAlertEnabled?: boolean;
  balance: number;
  loyaltyPoints?: number;
  dueDate?: string;
  lastNote: string;
  lastEntryAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface KhataEntry {
  id: string;
  ownerUid: string;
  branchId?: string;
  contactId: string;
  contactName: string;
  entryType: KhataEntryType;
  amount: number;
  note: string;
  createdAt: Timestamp | null;
}

export interface CashEntry {
  id: string;
  ownerUid: string;
  branchId?: string;
  cashType: CashType;
  category: string;
  amount: number;
  note: string;
  createdAt: Timestamp | null;
}

export interface Product {
  id: string;
  ownerUid: string;
  branchId?: string;
  name: string;
  code: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold: number;
  expiryDate?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SaleInvoiceItem {
  productId: string;
  name: string;
  code: string;
  qty: number;
  unitPrice: number;
  purchasePrice: number;
  lineTotal: number;
}

export interface SaleInvoice {
  id: string;
  ownerUid: string;
  branchId?: string;
  invoiceNo: string;
  items: SaleInvoiceItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  costTotal: number;
  profitAmount: number;
  paymentMode: 'cash' | 'due';
  contactId?: string;
  contactName?: string;
  customerPhone?: string;
  loyaltyEarned?: number;
  loyaltyRedeemed?: number;
  note?: string;
  createdAt: Timestamp | null;
}

export interface TelecomEntry {
  id: string;
  ownerUid: string;
  branchId?: string;
  operator: TelecomOperator;
  serviceType: TelecomServiceType;
  customerPhone: string;
  amount: number;
  commission: number;
  paymentStatus: 'paid' | 'due';
  note: string;
  createdAt: Timestamp | null;
}

export interface ShopBranch {
  id: string;
  ownerUid: string;
  name: string;
  address?: string;
  phone?: string;
  businessType?: string;
  isDefault: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  code?: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  ownerUid: string;
  branchId?: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceRef?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paymentMode: 'cash' | 'due';
  note?: string;
  createdAt: Timestamp | null;
}

export interface InstallmentPlan {
  id: string;
  ownerUid: string;
  branchId?: string;
  contactId?: string;
  contactName: string;
  customerPhone?: string;
  itemTitle: string;
  totalAmount: number;
  downPayment: number;
  installmentCount: number;
  paidCount: number;
  installmentAmount: number;
  frequency: 'weekly' | 'monthly';
  nextDueDate: string;
  remainingAmount: number;
  status: 'active' | 'completed';
  note?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type StaffRole = 'manager' | 'cashier' | 'salesman';

export interface StaffMember {
  id: string;
  ownerUid: string;
  branchId?: string;
  name: string;
  phone?: string;
  role: StaffRole;
  pinHash: string;
  canViewProfit: boolean;
  canDeleteRecords: boolean;
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ShiftClosing {
  id: string;
  ownerUid: string;
  branchId?: string;
  staffName: string;
  shiftLabel: string;
  openingCash: number;
  cashInTotal: number;
  cashOutTotal: number;
  expectedClosing: number;
  actualCashCount: number;
  variance: number;
  note?: string;
  createdAt: Timestamp | null;
}

export type SupportTicketStatus = 'open' | 'pending' | 'processing' | 'resolved' | 'rejected';
export type UpgradeRequestStatus = 'pending' | 'processing' | 'active' | 'rejected';
export type ComplaintSeverity = 'normal' | 'urgent' | 'critical';
export type ComplaintStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

export interface SupportTicket {
  id: string;
  ownerUid: string;
  subject: string;
  category: string;
  message: string;
  contactPhone: string;
  status: SupportTicketStatus;
  adminReply?: string;
  statusReason?: string;
  repliedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Complaint {
  id: string;
  ownerUid: string;
  title: string;
  category: string;
  severity: ComplaintSeverity;
  referenceInfo?: string;
  description: string;
  contactPhone: string;
  status: ComplaintStatus;
  adminReply?: string;
  statusReason?: string;
  repliedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UpgradeRequest {
  id: string;
  ownerUid: string;
  planTier: 'pro' | 'business' | 'catalog';
  catalogTitle?: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  paymentMethod: PaymentGatewayId;
  senderNumber: string;
  trxId: string;
  status: UpgradeRequestStatus;
  statusReason?: string;
  startedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
  createdAt: Timestamp | null;
}

export interface AppUpdateConfig {
  latestVersionName: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  apkDownloadUrl: string;
  updateDescription: string;
  forceUpdate: boolean;
  publishedBy?: string;
  updatedAt?: Timestamp | null;
}


