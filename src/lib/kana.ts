import type { KanaItem } from '@/data/types';

export const PASS = 8; // 解鎖測驗：10 題答對 8 題
export const QN = 10;
/** 一般測驗可以選的題數；0 = 範圍裡的每個字（句子）各考一次，ENDLESS = 不限題數，想停再按結束 */
export const ENDLESS = -1;
export const QN_OPTS = [10, 20, 30, 50, 0, ENDLESS] as const;

/** 出題方式：平均出題，或常錯的字優先 */
export type QuizPick = 'even' | 'weak';
/** 弱點分數：答錯 +2、答對 -1，最多 10 */
export const WEAK_MISS = 2;
export const WEAK_MAX = 10;
/** 常錯的字被抽到的機率：弱點分數 2（錯一次）大約是一般字的 9 倍 */
export const weakWeight = (w: number) => 1 + 4 * w;

/**
 * 依權重抽 n 題（可以重複），同一個字不會連續出現，
 * 也不會一直抽同一個字（每個字最多出現 n / 範圍大小 + 2 次）。
 */
export function pickWeighted(P: KanaItem[], n: number, weight: (a: KanaItem) => number): KanaItem[] {
  const cap = Math.ceil(n / P.length) + 2;
  const count = new Map<KanaItem, number>();
  const out: KanaItem[] = [];
  while (out.length < n) {
    const prev = out[out.length - 1];
    let cand = P.filter((x) => x !== prev && (count.get(x) ?? 0) < cap);
    if (!cand.length) cand = P.filter((x) => x !== prev);
    if (!cand.length) cand = P;
    const ws = cand.map(weight);
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    let pick = cand[cand.length - 1]!;
    for (let i = 0; i < cand.length; i++) {
      r -= ws[i]!;
      if (r < 0) {
        pick = cand[i]!;
        break;
      }
    }
    out.push(pick);
    count.set(pick, (count.get(pick) ?? 0) + 1);
  }
  return out;
}

export const shuffle = <T>(a: readonly T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

export const toKata = (t: string) =>
  t.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

export const glyphs = (t: string) => [...t].length;

/** 字卡上的字數變多時（例如 おばあさん），自動縮小字級 */
export function sqFontSize(t: string): string | undefined {
  const n = glyphs(t);
  if (n <= 1) return undefined;
  const sizes: Record<number, [number, number, number]> = {
    2: [28, 6, 44],
    3: [20, 4.2, 32],
    4: [16, 3.2, 25],
    5: [13, 2.6, 20],
  };
  const [min, vw, max] = sizes[n] ?? [11, 2.1, 17];
  return `clamp(${min}px,${vw}vw,${max}px)`;
}

export const fitPx = (t: string, base: number, room: number) =>
  `min(${base}px, calc(min(100vw - 96px, ${room}px) / ${glyphs(t) * 1.05}))`;

/** 同音的字（例如 じ／ぢ、お／を、あ／ア）不會出現在同一題 */
export const snd = (k: KanaItem) => k.snd || k.r;

/** k2z、a2z（看句子／聽錄音選中文意思）只用在入門大會考 */
export type QuizMode = 'k2r' | 'a2k' | 'r2k' | 'k2z' | 'a2z';

/** 這種題型的選項是中文意思 */
export const isMeaning = (m: QuizMode) => m === 'k2z' || m === 'a2z';
/** 這種題型要先聽發音 */
export const isListen = (m: QuizMode) => m === 'a2k' || m === 'a2z';

/** 中文說明的第一句（例如「不用了，謝謝。（第 5 課學過）」→「不用了，謝謝」），當作意思題的選項 */
export function gist(z: string): string {
  const t = (z.match(/^.*?[。？！?!]/)?.[0] ?? z).trim();
  return t.endsWith('。') ? t.slice(0, -1) : t;
}

export const MODES: { id: QuizMode; t: string }[] = [
  { id: 'k2r', t: '看字選拼音' },
  { id: 'a2k', t: '聽音選字' },
  { id: 'r2k', t: '看拼音選字' },
];

export interface Question {
  a: KanaItem;
  m: QuizMode;
  opts: KanaItem[];
}

/**
 * 出題：P 是出題範圍，D 是補干擾選項用的範圍（只有 3 個字的行，從前一行補）。
 * 連續兩題不會是同一個字；選項最多 4 個，而且彼此不同音（意思題的選項也不會有相同的意思）。
 * modeFn 決定每一題的題型，可以依題目的字決定（例如有錄音的句子才出聽力題）。
 * 有 weight 時依權重抽題（常錯的字比較常出），沒有就每個字輪流出。
 */
export function makeQs(
  P: KanaItem[],
  modeFn: (a: KanaItem) => QuizMode,
  D: KanaItem[] = P,
  n = QN,
  weight?: (a: KanaItem) => number,
): Question[] {
  let qs: KanaItem[] = [];
  if (weight) qs = pickWeighted(P, n, weight);
  while (qs.length < n) {
    const b = shuffle(P);
    if (qs.length && b.length > 1 && b[0]!.k === qs[qs.length - 1]!.k) b.push(b.shift()!);
    qs = qs.concat(b);
  }
  return qs.slice(0, n).map((a) => {
    const m = modeFn(a);
    const used = new Set([snd(a)]);
    const usedZ = new Set([gist(a.z)]);
    // 不同步驟可能有同一個字（例如第 5 課的「水」みず、第 9 課的「水曜日」），選項的字也不重複
    const usedK = new Set([a.k]);
    const opts = [a];
    for (const x of shuffle(P).concat(shuffle(D))) {
      if (opts.length >= 4) break;
      if (opts.includes(x) || used.has(snd(x)) || usedK.has(x.k) || (isMeaning(m) && usedZ.has(gist(x.z)))) continue;
      used.add(snd(x));
      usedK.add(x.k);
      usedZ.add(gist(x.z));
      opts.push(x);
    }
    return { a, m, opts: shuffle(opts) };
  });
}

/**
 * 大會考出題：groups 是每個單元（或每一課）的題目，
 * 每個單元平均出題，干擾選項優先用同一個單元的，不夠再從全部的補。
 */
export function makeExam(groups: KanaItem[][], modeFn: (a: KanaItem) => QuizMode, n: number): Question[] {
  const all = groups.flat();
  const qs: Question[] = [];
  groups.forEach((g, i) => {
    // 題數除不盡時，多的題目給前面的單元
    const m = Math.floor(n / groups.length) + (i < n % groups.length ? 1 : 0);
    if (m && g.length) qs.push(...makeQs(g, modeFn, all, m));
  });
  // 打散順序；同一個字連續出現就重新打散
  let out = shuffle(qs);
  for (let t = 0; t < 20 && out.some((x, i) => i > 0 && x.a.k === out[i - 1]!.a.k); t++) out = shuffle(qs);
  return out;
}
