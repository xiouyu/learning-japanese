/* ===== 教材資料：之後每學一步，在 steps.json 加一筆 ===== */
import raw from './steps.json';
import type { GojuonRow, KanaItem, RoadmapItem, Step } from './types';
import { toKata } from '@/lib/kana';

export const STEPS = raw as Step[];

export const ROADMAP: RoadmapItem[] = [
  ...STEPS.map((s) => ({ n: s.id, t: s.title, row: s.row, note: s.note, part: s.part })),
  // 還沒加進網站的下一課：學習路線最後顯示「下一站」
  { n: STEPS.length + 1, t: '第 14 課 大きな建物ですね', row: '第14課', note: '準備中', part: '下一站', ext: true },
];

export const GOJUON: GojuonRow[] = [
  ['—', [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']], 1],
  ['k', [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']], 2],
  ['s', [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']], 3],
  ['t', [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']], 4],
  ['n', [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']], 5],
  ['h', [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']], 6],
  ['m', [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']], 7],
  ['y', [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']], 8],
  ['r', [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']], 9],
  ['w', [['わ', 'wa'], null, null, null, ['を', 'wo']], 10],
  ['ん', [['ん', 'n'], null, null, null, null], 10],
];

export const TOTAL = 46;

export const ALL_KANA: KanaItem[] = STEPS.flatMap((s) => s.kana.map((k) => ({ ...k, step: s.id })));

/** 46 個基本平假名／片假名，用來算頂端進度格 */
export const BASE = new Set(GOJUON.flatMap((r) => r[1].filter((c) => c !== null).map((c) => c[0])));
export const BASE_K = new Set([...BASE].map(toKata));

export function stepLabel(n: number): string {
  const s = STEPS.find((x) => x.id === n);
  if (s) return s.row;
  const r = ROADMAP.find((x) => x.n === n);
  return r ? r.row || r.t : '';
}
