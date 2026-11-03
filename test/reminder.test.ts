import { describe, expect, it } from 'vitest';
import { buildMail, dayKey, hourIn, inRemindWindow, streakBefore } from '../scripts/reminder/lib.mjs';

const TZ = 'Asia/Taipei';

describe('每日提醒', () => {
  it('用台灣時間算今天：UTC 16:00 已經是台灣隔天', () => {
    expect(dayKey(new Date('2026-11-02T15:59:00Z'), TZ)).toBe('2026-11-02');
    expect(dayKey(new Date('2026-11-02T16:00:00Z'), TZ)).toBe('2026-11-03');
  });

  it('只在台灣時間晚上寄：排程延遲到隔天清晨就不寄', () => {
    expect(hourIn(new Date('2026-11-02T11:30:00Z'), TZ)).toBe(19);
    expect(inRemindWindow(new Date('2026-11-02T11:30:00Z'), TZ)).toBe(true); // 19:30
    expect(inRemindWindow(new Date('2026-11-02T15:59:00Z'), TZ)).toBe(true); // 23:59
    expect(inRemindWindow(new Date('2026-11-02T16:00:00Z'), TZ)).toBe(false); // 隔天 00:00
    expect(inRemindWindow(new Date('2026-11-02T20:51:00Z'), TZ)).toBe(false); // 隔天 04:51（真的發生過）
    expect(inRemindWindow(new Date('2026-11-02T09:59:00Z'), TZ)).toBe(false); // 17:59
  });

  it('連續天數從昨天往回算，中間斷掉就停', () => {
    const now = new Date('2026-11-02T11:30:00Z'); // 台灣 19:30
    expect(streakBefore({ '2026-11-01': 3, '2026-10-31': 20, '2026-10-29': 5 }, now, TZ)).toBe(2);
    expect(streakBefore({ '2026-11-02': 3 }, now, TZ)).toBe(0);
    expect(streakBefore({}, now, TZ)).toBe(0);
    // 跨月
    expect(streakBefore({ '2026-11-01': 1, '2026-10-31': 1, '2026-10-30': 1 }, now, TZ)).toBe(3);
  });

  it('信件有今日複習的連結、連續天數，內容會跳脫 HTML', () => {
    const m = buildMail({ streak: 4, syncedAt: new Date('2026-11-02T10:05:00Z'), siteUrl: 'https://x.github.io/a', timeZone: TZ });
    expect(m.subject).toContain('連續 4 天');
    expect(m.text).toContain('https://x.github.io/a/#/quiz?daily=1');
    expect(m.text).toContain('18:05');
    expect(m.html).toContain('變成 5 天');
    const z = buildMail({ streak: 0, syncedAt: null, siteUrl: 'https://x/<b>', timeZone: TZ });
    expect(z.subject).not.toContain('連續');
    expect(z.html).not.toContain('<b>');
  });
});
