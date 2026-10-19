import type { KanaItem } from '@/data/types';
import { shuffle } from './kana';

/** 今日複習的題數，也是每天的目標題數 */
export const DAILY_N = 20;

const pad = (n: number) => String(n).padStart(2, '0');
/** 本地時間的日期，例如 2026-10-19（學習紀錄用，跟著使用者的時區） */
export const dayKey = (t: Date = new Date()) => `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
/** 本地時間的第幾天（1970-01-01 起算），用來算多久沒練 */
export const dayNum = (t: Date = new Date()) => Math.floor((t.getTime() - t.getTimezoneOffset() * 60000) / 86400000);

/** 連續學習幾天：從今天往回算；今天還沒練的話從昨天算起（今天結束前都不算中斷） */
export function streak(daily: Record<string, number>, now: Date = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!daily[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (daily[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/**
 * 今日複習出題：常錯的、很久沒練的（沒在測驗裡答過的也算）、最近學的各一部分，湊滿 n 題。
 * pool 是已經解鎖的字和句子；recent 是最近幾步的步驟 id。
 */
export function pickDaily(
  pool: KanaItem[],
  o: { weak: Record<string, number>; seen: Record<string, number>; recent: Set<number>; today: number },
  n = DAILY_N,
): KanaItem[] {
  const uniq = [...new Map(pool.map((k) => [k.k, k])).values()];
  const out: KanaItem[] = [];
  const add = (xs: KanaItem[], m: number) => {
    for (const x of xs) {
      if (out.length >= n || m <= 0) break;
      if (out.includes(x)) continue;
      out.push(x);
      m--;
    }
  };
  const third = Math.ceil(n / 3);
  add(
    shuffle(uniq.filter((k) => o.weak[k.k])).sort((a, b) => o.weak[b.k]! - o.weak[a.k]!),
    third,
  );
  // 很久沒練：上次答題的日子越早越優先，今天已經練過的不算
  add(
    shuffle(uniq.filter((k) => (o.seen[k.k] ?? -1) < o.today)).sort((a, b) => (o.seen[a.k] ?? -1) - (o.seen[b.k] ?? -1)),
    third,
  );
  add(shuffle(uniq.filter((k) => o.recent.has(k.step))), n);
  add(shuffle(uniq), n);
  return shuffle(out);
}
