/* 每日提醒用到的日期計算和信件內容（純函式，test/reminder.test.ts 有測試） */

/** 某個時區的日期，格式跟網站的 dayKey 一樣：2026-11-02 */
export function dayKey(t, timeZone) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
}

/** 到昨天為止連續練習了幾天（今天還沒練，所以從昨天往回算） */
export function streakBefore(daily, now, timeZone) {
  let n = 0;
  // 台灣沒有日光節約時間，一天固定 24 小時
  for (let t = now.getTime() - 86400000; daily[dayKey(new Date(t), timeZone)] > 0; t -= 86400000) n++;
  return n;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 提醒信：主旨、純文字、HTML */
export function buildMail({ streak, syncedAt, siteUrl, timeZone }) {
  const link = `${siteUrl.replace(/\/?$/, '/')}#/quiz?daily=1`;
  const subject = streak > 0 ? `今天還沒練日文喔！已經連續 ${streak} 天了` : '今天還沒練日文喔！';
  const lead =
    streak > 0
      ? `你已經連續學習 ${streak} 天，今天做一題就能變成 ${streak + 1} 天，別讓紀錄斷掉！`
      : '今天還沒做過任何一題測驗。花 5 分鐘做個今日複習，就能開始累積連續天數。';
  const synced = syncedAt
    ? new Intl.DateTimeFormat('zh-TW', { timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(syncedAt)
    : '';
  const note = `如果你其實已經練過了，可能是那台裝置還沒連上網路同步${synced ? `（雲端最後同步：${synced}）` : ''}，打開網站就會自動同步。`;
  const text = `${lead}\n\n開始今日複習：${link}\n\n${note}\n\n— 一步一步學習日文・每日提醒`;
  const html = `<div style="font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1D2736;line-height:1.7">
  <p style="font-size:13px;letter-spacing:.08em;color:#2C4F82;margin:0 0 4px">一步一步學習日文・每日提醒</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(subject)}</h1>
  <p style="margin:0 0 20px">${esc(lead)}</p>
  <p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#2C4F82;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700">開始今日複習 →</a></p>
  <p style="font-size:13px;color:#5D6776;margin:0">${esc(note)}</p>
</div>`;
  return { subject, text, html };
}
