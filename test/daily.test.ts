import { describe, expect, it } from 'vitest';
import { ALL_KANA } from '@/data';
import { DAILY_N, dayKey, pickDaily, streak } from '@/lib/daily';

describe('學習紀錄', () => {
  const now = new Date(2026, 9, 19, 21, 0); // 2026-10-19 晚上 9 點

  it('日期用本地時間', () => {
    expect(dayKey(now)).toBe('2026-10-19');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('連續學習天數：今天還沒練就從昨天算，中斷就重算', () => {
    expect(streak({ '2026-10-19': 3, '2026-10-18': 5, '2026-10-17': 1 }, now)).toBe(3);
    expect(streak({ '2026-10-18': 5, '2026-10-17': 1 }, now)).toBe(2);
    expect(streak({ '2026-10-19': 3, '2026-10-17': 1 }, now)).toBe(1);
    expect(streak({ '2026-10-16': 3 }, now)).toBe(0);
    // 跨月
    expect(streak({ '2026-11-01': 1, '2026-10-31': 1 }, new Date(2026, 10, 1))).toBe(2);
  });
});

describe('今日複習出題', () => {
  const pool = ALL_KANA.filter((k) => k.step <= 20);
  const today = 20000;

  it('湊滿 20 題，不重複', () => {
    const qs = pickDaily(pool, { weak: {}, seen: {}, recent: new Set([20]), today });
    expect(qs).toHaveLength(DAILY_N);
    expect(new Set(qs.map((k) => k.k)).size).toBe(DAILY_N);
  });

  it('常錯的、很久沒練的一定會出現', () => {
    const weak = { ぬ: 6, ね: 4 };
    const seen: Record<string, number> = {};
    for (const k of pool) seen[k.k] = today; // 今天都練過了
    seen['ほ'] = today - 30; // 只有「ほ」很久沒練
    const qs = pickDaily(pool, { weak, seen, recent: new Set([20]), today }).map((k) => k.k);
    expect(qs).toContain('ぬ');
    expect(qs).toContain('ね');
    expect(qs).toContain('ほ');
  });

  it('範圍比 20 個少時就全部出', () => {
    const small = ALL_KANA.filter((k) => k.step === 1);
    expect(pickDaily(small, { weak: {}, seen: {}, recent: new Set([1]), today })).toHaveLength(small.length);
  });
});
