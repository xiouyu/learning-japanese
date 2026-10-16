import type { KanaItem } from '@/data/types';

export const PASS = 8; // 解鎖測驗：10 題答對 8 題
export const QN = 10;

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

export type QuizMode = 'k2r' | 'a2k' | 'r2k';

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
 * 連續兩題不會是同一個字；選項最多 4 個，而且彼此不同音。
 */
export function makeQs(P: KanaItem[], modeFn: () => QuizMode, D: KanaItem[] = P, n = QN): Question[] {
  let qs: KanaItem[] = [];
  while (qs.length < n) {
    const b = shuffle(P);
    if (qs.length && b.length > 1 && b[0]!.k === qs[qs.length - 1]!.k) b.push(b.shift()!);
    qs = qs.concat(b);
  }
  return qs.slice(0, n).map((a) => {
    const used = new Set([snd(a)]);
    const opts = [a];
    for (const x of shuffle(P).concat(shuffle(D))) {
      if (opts.length >= 4) break;
      if (opts.includes(x) || used.has(snd(x))) continue;
      used.add(snd(x));
      opts.push(x);
    }
    return { a, m: modeFn(), opts: shuffle(opts) };
  });
}

/** 五十音大會考：學完假名、進入課本第 1 課前的總複習 */
export const EXAM_N = 30;
export const EXAM_PASS = 27;

/**
 * 大會考出題：groups 是每個單元的字（平假名、濁音、拗音、片假名…），
 * 每個單元平均出題，干擾選項優先用同一個單元的字，不夠再從全部的字補。
 */
export function makeExam(groups: KanaItem[][], modeFn: () => QuizMode, n = EXAM_N): Question[] {
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
