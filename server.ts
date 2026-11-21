import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import nodemailer, { type Transporter } from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const OWNER_EMAIL = 'nahidulislamnahid357@gmail.com';

let cachedFirebaseApiKey = '';
let cachedFirebaseProjectId = '';
let cachedFirestoreDbId = '(default)';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
      apiKey?: string;
      projectId?: string;
      firestoreDatabaseId?: string;
    };
    cachedFirebaseApiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
    cachedFirebaseProjectId = typeof parsed.projectId === 'string' ? parsed.projectId : '';
    cachedFirestoreDbId =
      typeof parsed.firestoreDatabaseId === 'string' && parsed.firestoreDatabaseId
        ? parsed.firestoreDatabaseId
        : '(default)';
  }
} catch {
  cachedFirebaseApiKey = '';
}

interface ServerAppUpdatePolicy {
  latestVersionName: string;
  latestVersionCode: number;
  minSupportedVersionCode: number;
  apkDownloadUrl: string;
  updateDescription: string;
  forceUpdate: boolean;
  publishedBy: string;
  updatedAt: string | null;
}

const DEFAULT_SERVER_APP_UPDATE_POLICY: ServerAppUpdatePolicy = {
  latestVersionName: '1.0.0',
  latestVersionCode: 1,
  minSupportedVersionCode: 1,
  apkDownloadUrl: '',
  updateDescription: '',
  forceUpdate: false,
  publishedBy: 'Owner',
  updatedAt: null,
};

let cachedAppUpdatePolicy: ServerAppUpdatePolicy = DEFAULT_SERVER_APP_UPDATE_POLICY;
let cachedAppUpdateAtMs = 0;
const APP_UPDATE_CACHE_TTL_MS = 5000;

function readFirestoreFieldString(
  fields: Record<string, Record<string, unknown>>,
  key: string
): string {
  const v = fields[key]?.stringValue;
  return typeof v === 'string' ? v : '';
}

function readFirestoreFieldNumber(
  fields: Record<string, Record<string, unknown>>,
  key: string,
  fallback: number
): number {
  const f = fields[key];
  if (!f) return fallback;
  if (typeof f.integerValue === 'string' || typeof f.integerValue === 'number') {
    const n = Number(f.integerValue);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof f.doubleValue === 'number') {
    return Number.isFinite(f.doubleValue) ? f.doubleValue : fallback;
  }
  return fallback;
}

function readFirestoreFieldBoolean(
  fields: Record<string, Record<string, unknown>>,
  key: string,
  fallback: boolean
): boolean {
  const v = fields[key]?.booleanValue;
  return typeof v === 'boolean' ? v : fallback;
}

async function getLiveAppUpdatePolicy(forceRefresh = false): Promise<ServerAppUpdatePolicy> {
  const now = Date.now();
  if (!forceRefresh && now - cachedAppUpdateAtMs < APP_UPDATE_CACHE_TTL_MS) {
    return cachedAppUpdatePolicy;
  }

  if (!cachedFirebaseProjectId || !cachedFirebaseApiKey) {
    return cachedAppUpdatePolicy;
  }

  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        cachedFirebaseProjectId
      )}/databases/${encodeURIComponent(
        cachedFirestoreDbId
      )}/documents/platformConfig/appUpdate?key=${encodeURIComponent(
        cachedFirebaseApiKey
      )}`;

    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) {
      cachedAppUpdatePolicy = DEFAULT_SERVER_APP_UPDATE_POLICY;
      cachedAppUpdateAtMs = now;
      return cachedAppUpdatePolicy;
    }
    if (!res.ok) {
      return cachedAppUpdatePolicy;
    }

    const docData = (await res.json()) as {
      fields?: Record<string, Record<string, unknown>>;
    };
    const fields = docData.fields || {};
    const latestCode = Math.max(
      1,
      Math.round(readFirestoreFieldNumber(fields, 'latestVersionCode', 1))
    );
    const minCode = Math.max(
      1,
      Math.min(
        latestCode,
        Math.round(readFirestoreFieldNumber(fields, 'minSupportedVersionCode', latestCode))
      )
    );

    cachedAppUpdatePolicy = {
      latestVersionName:
        readFirestoreFieldString(fields, 'latestVersionName') || '1.0.0',
      latestVersionCode: latestCode,
      minSupportedVersionCode: minCode,
      apkDownloadUrl: readFirestoreFieldString(fields, 'apkDownloadUrl'),
      updateDescription: readFirestoreFieldString(fields, 'updateDescription'),
      forceUpdate: readFirestoreFieldBoolean(fields, 'forceUpdate', false),
      publishedBy: readFirestoreFieldString(fields, 'publishedBy') || 'Owner',
      updatedAt:
        typeof fields.updatedAt?.timestampValue === 'string'
          ? fields.updatedAt.timestampValue
          : null,
    };
    cachedAppUpdateAtMs = now;
    return cachedAppUpdatePolicy;
  } catch {
    return cachedAppUpdatePolicy;
  }
}

function getSmtpConfig(): { user: string; pass: string; adminTo: string } | null {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();
  const adminTo = (process.env.ADMIN_NOTIFY_EMAIL || user).trim();
  if (!user || !pass || !adminTo) return null;
  return { user, pass, adminTo };
}

let cachedTransporterKey = '';
let cachedTransporter: Transporter | null = null;
function getMailTransporter(): {
  transporter: Transporter;
  user: string;
  adminTo: string;
} | null {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  const key = `${cfg.user}:${cfg.pass.length}:${cfg.adminTo}`;
  if (!cachedTransporter || cachedTransporterKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });
    cachedTransporterKey = key;
  }
  return { transporter: cachedTransporter, user: cfg.user, adminTo: cfg.adminTo };
}

function escapeHtml(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : String(raw ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanField(raw: unknown, maxLen: number): string {
  return (typeof raw === 'string' ? raw : String(raw ?? ''))
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email: string; emailVerified: boolean } | null> {
  if (!idToken || !cachedFirebaseApiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        cachedFirebaseApiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: { localId?: string; email?: string; emailVerified?: boolean }[];
    };
    const u = data.users?.[0];
    if (!u?.localId) return null;
    return {
      uid: u.localId,
      email: typeof u.email === 'string' ? u.email : '',
      emailVerified: Boolean(u.emailVerified),
    };
  } catch {
    return null;
  }
}

const orderNotifyRateMap = new Map<string, number[]>();
function allowOrderNotifyRate(uid: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (orderNotifyRateMap.get(uid) || []).filter(
    (t) => now - t < windowMs
  );
  if (recent.length >= 15) {
    orderNotifyRateMap.set(uid, recent);
    return false;
  }
  recent.push(now);
  orderNotifyRateMap.set(uid, recent);
  return true;
}

let cachedAi: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

const ttsMemoryCache = new Map<string, { data: string; mimeType: string }>();
const MAX_TTS_CACHE = 40;
let ttsCooldownUntilMs = 0;

function parseRetryAfterSec(errText: string): number {
  const match = errText.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (match && match[1]) {
    const secs = Number(match[1]);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(3600, Math.max(60, secs));
    }
  }
  return 900;
}

async function enforceAppVersion(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const policy = await getLiveAppUpdatePolicy();
  const requiredMin = Math.max(
    policy.minSupportedVersionCode,
    policy.latestVersionCode
  );
  if (!policy.forceUpdate || requiredMin <= 1) {
    next();
    return;
  }

  const rawCodeHeader = req.headers['x-app-version-code'];
  const parsedCode = Number(
    Array.isArray(rawCodeHeader) ? rawCodeHeader[0] : rawCodeHeader ?? 0
  );

  if (Number.isFinite(parsedCode) && parsedCode >= requiredMin) {
    next();
    return;
  }

  // Allow verified Owner Admin portal requests only if bearer token verifies Owner identity
  if (req.headers['x-admin-portal'] === '1') {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const verifiedUser = await verifyFirebaseIdToken(bearer);
    if (
      verifiedUser &&
      verifiedUser.emailVerified &&
      verifiedUser.email.toLowerCase() === OWNER_EMAIL
    ) {
      next();
      return;
    }
  }

  res.status(426).json({
    ok: false,
    code: 'APP_UPDATE_REQUIRED',
    updateRequired: true,
    error:
      'অ্যাপের পুরোনো ভার্সন থেকে গুরুত্বপূর্ণ API কার্যক্রম বন্ধ করা হয়েছে। অনুগ্রহ করে নতুন ভার্সন আপডেট করুন।',
    policy,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      emailConfigured: Boolean(getSmtpConfig()),
      ttsAvailable: Boolean(process.env.GEMINI_API_KEY) && Date.now() >= ttsCooldownUntilMs,
      ttsCooldownSec:
        Date.now() < ttsCooldownUntilMs
          ? Math.ceil((ttsCooldownUntilMs - Date.now()) / 1000)
          : 0,
    });
  });

  app.get('/api/app-update', async (req, res) => {
    const policy = await getLiveAppUpdatePolicy();
    const rawCode =
      req.headers['x-app-version-code'] ?? req.query.versionCode ?? '0';
    const clientCode = Number(Array.isArray(rawCode) ? rawCode[0] : rawCode);
    const requiredMin = Math.max(
      policy.minSupportedVersionCode,
      policy.latestVersionCode
    );
    const updateRequired =
      policy.forceUpdate &&
      (!Number.isFinite(clientCode) || clientCode < requiredMin);

    res.json({
      ok: true,
      updateRequired,
      policy,
    });
  });

  app.post('/api/app-update/refresh', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const verifiedUser = await verifyFirebaseIdToken(bearer);
    if (
      !verifiedUser ||
      !verifiedUser.emailVerified ||
      verifiedUser.email.toLowerCase() !== OWNER_EMAIL
    ) {
      res.status(403).json({
        ok: false,
        error: 'Only the platform Owner can refresh update policy.',
      });
      return;
    }

    const policy = await getLiveAppUpdatePolicy(true);
    res.json({ ok: true, policy });
  });

  app.get('/api/apk-download', (_req, res) => {
    const apkPaths = [
      path.resolve(__dirname, 'APK_DOWNLOAD', 'app-debug.apk'),
      path.resolve(__dirname, '.build-outputs', 'app-debug.apk'),
    ];
    const found = apkPaths.find((p) => fs.existsSync(p));
    if (!found) {
      res.status(404).json({ ok: false, error: 'APK file is not available.' });
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="MUNAF-SHOP.apk"');
    res.sendFile(found);
  });

  app.post('/api/notify-order', enforceAppVersion, async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const verifiedUser = await verifyFirebaseIdToken(bearer);
    if (!verifiedUser) {
      res.status(401).json({ ok: false, error: 'Unauthorized request.' });
      return;
    }

    if (!allowOrderNotifyRate(verifiedUser.uid)) {
      res.status(429).json({ ok: false, error: 'Too many notifications sent.' });
      return;
    }

    const mailer = getMailTransporter();
    if (!mailer) {
      res.status(503).json({ ok: false, error: 'Email notifications are not configured.' });
      return;
    }

    const shopName = cleanField(req.body?.shopName, 120) || 'MUNAF SHOP Customer';
    const shopPhone = cleanField(req.body?.shopPhone, 30);
    const customerEmail =
      cleanField(req.body?.customerEmail, 150) || verifiedUser.email;
    const planTitle = cleanField(req.body?.planTitle, 140) || 'Package Order';
    const billingCycle = cleanField(req.body?.billingCycle, 24) || 'monthly';
    const paymentMethod = cleanField(req.body?.paymentMethod, 32).toUpperCase() || 'MFS';
    const senderNumber = cleanField(req.body?.senderNumber, 32) || 'N/A';
    const trxId = cleanField(req.body?.trxId, 60).toUpperCase() || 'N/A';
    const rawAmount = Number(req.body?.amount);
    const amount = Number.isFinite(rawAmount) && rawAmount >= 0 ? Math.round(rawAmount) : 0;

    const dhakaTime = new Date().toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const cycleLabel = billingCycle === 'yearly' ? 'বার্ষিক (Yearly)' : 'মাসিক (Monthly)';
    const appOrigin = cleanField(
      process.env.APP_URL || req.headers.origin || '',
      240
    ).replace(/\/+$/, '');
    const adminPortalUrl = appOrigin ? `${appOrigin}/?admin=1` : '';

    const subject = `🛒 নতুন অর্ডার: ৳${amount} — ${planTitle} (${shopName})`;

    const textBody = [
      'MUNAF SHOP — নতুন কাস্টমার অর্ডার এসেছে!',
      '----------------------------------------',
      `দোকান: ${shopName}`,
      shopPhone ? `দোকানের ফোন: ${shopPhone}` : '',
      `কাস্টমার ইমেইল: ${customerEmail || 'N/A'}`,
      `প্যাকেজ / আইটেম: ${planTitle} (${cycleLabel})`,
      `টাকার পরিমাণ: ৳${amount}`,
      `পেমেন্ট মাধ্যম: ${paymentMethod}`,
      `সেন্ডার নম্বর: ${senderNumber}`,
      `TrxID: ${trxId}`,
      `সময় (বাংলাদেশ): ${dhakaTime}`,
      adminPortalUrl ? `অ্যাডমিন প্যানেল: ${adminPortalUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fffbf5; border: 1px solid #f3d5a5; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #991b1b, #b91c1c); color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #fde68a; font-weight: 700;">MUNAF SHOP · ORDER ALERT</p>
          <h2 style="margin: 6px 0 0; font-size: 20px;">নতুন কাস্টমার অর্ডার এসেছে! (৳${escapeHtml(amount)})</h2>
        </div>
        <div style="padding: 20px 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 7px 0; color: #64748b; width: 42%;">দোকানের নাম</td><td style="padding: 7px 0; font-weight: 700;">${escapeHtml(shopName)}</td></tr>
            ${shopPhone ? `<tr><td style="padding: 7px 0; color: #64748b;">দোকানের ফোন</td><td style="padding: 7px 0; font-weight: 600;">${escapeHtml(shopPhone)}</td></tr>` : ''}
            <tr><td style="padding: 7px 0; color: #64748b;">কাস্টমার ইমেইল</td><td style="padding: 7px 0;">${escapeHtml(customerEmail || 'N/A')}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">প্যাকেজ / আইটেম</td><td style="padding: 7px 0; font-weight: 700; color: #991b1b;">${escapeHtml(planTitle)} (${escapeHtml(cycleLabel)})</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">টাকার পরিমাণ</td><td style="padding: 7px 0; font-weight: 800; font-size: 16px; color: #047857;">৳${escapeHtml(amount)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">পেমেন্ট মাধ্যম</td><td style="padding: 7px 0; font-weight: 700;">${escapeHtml(paymentMethod)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">সেন্ডার নম্বর</td><td style="padding: 7px 0; font-family: monospace;">${escapeHtml(senderNumber)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Transaction ID</td><td style="padding: 7px 0; font-family: monospace; font-weight: 700;">${escapeHtml(trxId)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">সময়</td><td style="padding: 7px 0;">${escapeHtml(dhakaTime)}</td></tr>
          </table>
          ${
            adminPortalUrl
              ? `<div style="margin-top: 20px; text-align: center;">
                  <a href="${escapeHtml(adminPortalUrl)}" style="display: inline-block; background: #991b1b; color: #ffffff; text-decoration: none; font-weight: 700; padding: 11px 22px; border-radius: 10px;">অ্যাডমিন প্যানেল থেকে অনুমোদন করুন →</a>
                </div>`
              : ''
          }
        </div>
      </div>
    `;

    try {
      const info = await mailer.transporter.sendMail({
        from: `"MUNAF SHOP" <${mailer.user}>`,
        to: mailer.adminTo,
        replyTo: customerEmail || undefined,
        subject,
        text: textBody,
        html: htmlBody,
      });
      res.json({ ok: true, messageId: info.messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send email.';
      console.warn('Order notification email warning:', msg.slice(0, 200));
      res.status(502).json({ ok: false, error: 'Failed to send notification email.' });
    }
  });

  app.post('/api/notify-complaint', enforceAppVersion, async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const verifiedUser = await verifyFirebaseIdToken(bearer);
    if (!verifiedUser) {
      res.status(401).json({ ok: false, error: 'Unauthorized request.' });
      return;
    }

    if (!allowOrderNotifyRate(verifiedUser.uid)) {
      res.status(429).json({ ok: false, error: 'Too many notifications sent.' });
      return;
    }

    const mailer = getMailTransporter();
    if (!mailer) {
      res.status(503).json({ ok: false, error: 'Email notifications are not configured.' });
      return;
    }

    const kind = cleanField(req.body?.kind, 20) === 'ticket' ? 'ticket' : 'complaint';
    const shopName = cleanField(req.body?.shopName, 120) || 'MUNAF SHOP Customer';
    const customerEmail =
      cleanField(req.body?.customerEmail, 150) || verifiedUser.email;
    const contactPhone = cleanField(req.body?.contactPhone, 30) || 'N/A';
    const title = cleanField(req.body?.title, 140) || 'Customer Issue';
    const category = cleanField(req.body?.category, 80) || 'সাধারণ';
    const severityRaw = cleanField(req.body?.severity, 20);
    const severityLabel =
      severityRaw === 'critical'
        ? 'অতি জরুরি (Critical)'
        : severityRaw === 'urgent'
        ? 'জরুরি (Urgent)'
        : 'সাধারণ (Normal)';
    const referenceInfo = cleanField(req.body?.referenceInfo, 80);
    const rawDetails =
      typeof req.body?.details === 'string'
        ? req.body.details
        : typeof req.body?.description === 'string'
        ? req.body.description
        : '';
    const details = rawDetails.trim().slice(0, 800);

    const dhakaTime = new Date().toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const appOrigin = cleanField(
      process.env.APP_URL || req.headers.origin || '',
      240
    ).replace(/\/+$/, '');
    const adminPortalUrl = appOrigin ? `${appOrigin}/?admin=1` : '';

    const subject =
      kind === 'ticket'
        ? `🎫 নতুন সাপোর্ট টিকেট: ${title} (${shopName})`
        : `🚨 নতুন অভিযোগ (${severityLabel}): ${title} (${shopName})`;

    const textBody = [
      kind === 'ticket'
        ? 'MUNAF SHOP — নতুন সাপোর্ট টিকেট এসেছে!'
        : 'MUNAF SHOP — কাস্টমার অভিযোগ বক্সে নতুন অভিযোগ এসেছে!',
      '----------------------------------------',
      `দোকান: ${shopName}`,
      `কাস্টমার ইমেইল: ${customerEmail || 'N/A'}`,
      `যোগাযোগের নম্বর: ${contactPhone}`,
      `বিষয় / শিরোনাম: ${title}`,
      `ধরন (Category): ${category}`,
      kind === 'complaint' ? `গুরুত্ব: ${severityLabel}` : '',
      referenceInfo ? `রেফারেন্স / TrxID: ${referenceInfo}` : '',
      `বিস্তারিত: ${details}`,
      `সময় (বাংলাদেশ): ${dhakaTime}`,
      adminPortalUrl ? `অ্যাডমিন প্যানেল: ${adminPortalUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const headerBg =
      kind === 'ticket'
        ? 'linear-gradient(135deg, #0f766e, #047857)'
        : 'linear-gradient(135deg, #9f1239, #b91c1c)';
    const badgeTitle =
      kind === 'ticket' ? 'MUNAF SHOP · SUPPORT TICKET' : 'MUNAF SHOP · COMPLAINT BOX';
    const headingText =
      kind === 'ticket'
        ? 'নতুন সাপোর্ট টিকেট জমা হয়েছে'
        : 'অভিযোগ বক্সে নতুন অভিযোগ এসেছে!';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fffcf7; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: ${headerBg}; color: #ffffff; padding: 20px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #fde68a; font-weight: 700;">${badgeTitle}</p>
          <h2 style="margin: 6px 0 0; font-size: 20px;">${headingText}</h2>
        </div>
        <div style="padding: 20px 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 7px 0; color: #64748b; width: 40%;">দোকানের নাম</td><td style="padding: 7px 0; font-weight: 700;">${escapeHtml(shopName)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">কাস্টমার ইমেইল</td><td style="padding: 7px 0;">${escapeHtml(customerEmail || 'N/A')}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">যোগাযোগের নম্বর</td><td style="padding: 7px 0; font-family: monospace; font-weight: 700;">${escapeHtml(contactPhone)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">শিরোনাম</td><td style="padding: 7px 0; font-weight: 700; color: #991b1b;">${escapeHtml(title)}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">ধরন</td><td style="padding: 7px 0;">${escapeHtml(category)}</td></tr>
            ${
              kind === 'complaint'
                ? `<tr><td style="padding: 7px 0; color: #64748b;">গুরুত্বের মাত্রা</td><td style="padding: 7px 0; font-weight: 700; color: #b45309;">${escapeHtml(severityLabel)}</td></tr>`
                : ''
            }
            ${
              referenceInfo
                ? `<tr><td style="padding: 7px 0; color: #64748b;">রেফারেন্স / TrxID</td><td style="padding: 7px 0; font-family: monospace; font-weight: 700;">${escapeHtml(referenceInfo)}</td></tr>`
                : ''
            }
            <tr><td style="padding: 7px 0; color: #64748b;">সময়</td><td style="padding: 7px 0;">${escapeHtml(dhakaTime)}</td></tr>
          </table>
          <div style="margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #475569;">বিস্তারিত বিবরণ:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #0f172a;">${escapeHtml(details)}</p>
          </div>
          ${
            adminPortalUrl
              ? `<div style="margin-top: 20px; text-align: center;">
                  <a href="${escapeHtml(adminPortalUrl)}" style="display: inline-block; background: #991b1b; color: #ffffff; text-decoration: none; font-weight: 700; padding: 11px 22px; border-radius: 10px;">অ্যাডমিন প্যানেল থেকে উত্তর দিন →</a>
                </div>`
              : ''
          }
        </div>
      </div>
    `;

    try {
      const info = await mailer.transporter.sendMail({
        from: `"MUNAF SHOP" <${mailer.user}>`,
        to: mailer.adminTo,
        replyTo: customerEmail || undefined,
        subject,
        text: textBody,
        html: htmlBody,
      });
      res.json({ ok: true, messageId: info.messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send email.';
      console.warn('Complaint notification email warning:', msg.slice(0, 200));
      res.status(502).json({ ok: false, error: 'Failed to send complaint email.' });
    }
  });

  app.post('/api/tts', enforceAppVersion, async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const locale = req.body?.locale === 'en' ? 'en' : 'bn';
    const requestedVoice =
      typeof req.body?.voiceName === 'string' ? req.body.voiceName : 'Charon';

    if (!rawText) {
      res.status(400).json({ error: 'Text is required for TTS.' });
      return;
    }

    const cleanText = rawText.slice(0, 320);
    const voiceName = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(
      requestedVoice
    )
      ? requestedVoice
      : 'Charon';

    const cacheKey = `${locale}:${voiceName}:${cleanText}`;
    const cachedAudio = ttsMemoryCache.get(cacheKey);
    if (cachedAudio) {
      res.json({
        audioBase64: cachedAudio.data,
        mimeType: cachedAudio.mimeType,
        cached: true,
      });
      return;
    }

    if (Date.now() < ttsCooldownUntilMs) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((ttsCooldownUntilMs - Date.now()) / 1000)
      );
      res.status(429).json({
        error: 'TTS quota limit active; using device speech fallback.',
        fallback: 'browser',
        retryAfterSec,
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini TTS API key is not configured on the server.',
        fallback: 'browser',
      });
      return;
    }

    const stylePrompt =
      locale === 'bn'
        ? 'Speak warmly, clearly, and politely in natural everyday Bangladeshi Bengali like a helpful human shop assistant.'
        : 'Speak warmly, clearly, and politely in natural conversational English like a helpful human assistant.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (p) => Boolean(p.inlineData?.data)
      );
      const base64Audio = audioPart?.inlineData?.data;
      const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({ error: 'TTS model returned no audio payload.' });
        return;
      }

      if (ttsMemoryCache.size >= MAX_TTS_CACHE) {
        const firstKey = ttsMemoryCache.keys().next().value;
        if (firstKey) ttsMemoryCache.delete(firstKey);
      }
      ttsMemoryCache.set(cacheKey, { data: base64Audio, mimeType });

      res.json({
        audioBase64: base64Audio,
        mimeType,
        cached: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate speech audio.';
      const isQuota =
        message.includes('429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.toLowerCase().includes('quota');

      if (isQuota) {
        const retryAfterSec = parseRetryAfterSec(message);
        ttsCooldownUntilMs = Date.now() + retryAfterSec * 1000;
        console.warn(
          `TTS free-tier quota reached; cooling down Gemini TTS for ${retryAfterSec}s (client uses device speech fallback).`
        );
        res.status(429).json({
          error: 'TTS daily quota reached; using device voice fallback.',
          fallback: 'browser',
          retryAfterSec,
        });
        return;
      }

      console.warn('TTS upstream warning:', message.slice(0, 200));
      res.status(502).json({ error: 'Failed to generate speech audio.', fallback: 'browser' });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MUNAF SHOP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
