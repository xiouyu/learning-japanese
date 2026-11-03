/**
 * 每日學習提醒：今天（台灣時間）還沒做過任何一題，就用 Gmail 寄提醒信給自己。
 * 由 .github/workflows/reminder.yml 每天晚上執行，設定方式見 docs/reminder-setup.md。
 *
 * 環境變數：
 *   SUPABASE_URL          網站登入同步用的 Supabase 網址（從裡面取出專案代號）
 *   REMINDER_DB_HOST      Supabase「Connect › Session pooler」的 host
 *   REMINDER_DB_PASSWORD  唯讀帳號 reminder_reader 的密碼
 *   GMAIL_USER            寄信用的 Gmail 地址
 *   GMAIL_APP_PASSWORD    Gmail 應用程式密碼
 *   REMINDER_ACCOUNT      網站登入用的 Email（沒填就用 GMAIL_USER）
 *   REMINDER_TO           收提醒的 Email（沒填就用 GMAIL_USER）
 *   SITE_URL              網站網址（信裡的按鈕連到這裡）
 *   FORCE=true            今天練過也寄（測試用）
 *   DRY_RUN=true          不寄信，只印出信件內容（測試用）
 *   EVENT                 GitHub 的觸發方式；schedule（排程）只在晚上寄，手動執行隨時都寄
 */
import pg from 'pg';
import nodemailer from 'nodemailer';
import { REMIND_FROM, buildMail, dayKey, hourIn, inRemindWindow, streakBefore } from './lib.mjs';

const env = process.env;
const TZ = 'Asia/Taipei';
const on = (v) => v === 'true' || v === '1';
const dry = on(env.DRY_RUN);

const required = ['SUPABASE_URL', 'REMINDER_DB_HOST', 'REMINDER_DB_PASSWORD', ...(dry ? [] : ['GMAIL_USER', 'GMAIL_APP_PASSWORD'])];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  // 還沒設定好就安靜跳過，不要每天都顯示失敗
  console.log(`::notice::每日提醒還沒設定好，略過（缺少 ${missing.join('、')}）。設定方式見 docs/reminder-setup.md`);
  process.exit(0);
}

const account = env.REMINDER_ACCOUNT || env.GMAIL_USER;
const to = env.REMINDER_TO || env.GMAIL_USER;
if (!account) throw new Error('請設定 REMINDER_ACCOUNT 或 GMAIL_USER');
const ref = new URL(env.SUPABASE_URL).hostname.split('.')[0];
const now = new Date();
const today = dayKey(now, TZ);

if (env.EVENT === 'schedule' && !inRemindWindow(now, TZ)) {
  console.log(`::notice::排程延遲到台灣時間 ${hourIn(now, TZ)} 點才執行，不是晚上（${REMIND_FROM}:00 以後），略過不寄。`);
  process.exit(0);
}

const db = new pg.Client({
  host: env.REMINDER_DB_HOST,
  port: Number(env.REMINDER_DB_PORT || 5432),
  database: 'postgres',
  // Session pooler 的使用者名稱要加上專案代號
  user: env.REMINDER_DB_USER || `reminder_reader.${ref}`,
  password: env.REMINDER_DB_PASSWORD,
  // 連線有加密；Supabase 的憑證不在 Node 內建的清單裡，所以不驗證憑證（跟備份腳本的 sslmode=require 一樣）
  ssl: on(env.REMINDER_DB_NOSSL) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

await db.connect();
let row;
try {
  ({ rows: [row] } = await db.query('select daily, synced_at from reminder.daily_of($1)', [account]));
} finally {
  await db.end();
}
if (!row) throw new Error(`找不到 ${account} 的學習紀錄：請確認這是網站登入用的 Email，而且至少登入同步過一次`);

const daily = row.daily ?? {};
const n = Number(daily[today] ?? 0);
if (n > 0 && !on(env.FORCE)) {
  console.log(`${today} 已經練了 ${n} 題，不用提醒。`);
  process.exit(0);
}

const mail = buildMail({
  streak: streakBefore(daily, now, TZ),
  syncedAt: row.synced_at ? new Date(row.synced_at) : null,
  siteUrl: env.SITE_URL || 'https://xiouyu.github.io/learning-japanese/',
  timeZone: TZ,
});
// 測試寄信（今天其實練過了）：主旨標明是測試
if (n > 0) mail.subject = `【測試】${mail.subject}`;

if (dry) {
  console.log(`[DRY_RUN] ${today} 練了 ${n} 題，會寄給 ${to}\n主旨：${mail.subject}\n\n${mail.text}`);
  process.exit(0);
}

const smtp = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
});
await smtp.sendMail({ from: { name: '一步一步學習日文', address: env.GMAIL_USER }, to, ...mail });
console.log(`${today} 還沒練習，已寄出提醒。`);
