/* ===== 教材資料：之後每學一步，在 steps.json 加一筆 ===== */
import raw from './steps.json';
import rawCando from './cando.json';
import rawCulture from './culture.json';
import type { CanDo, Culture, GojuonRow, KanaItem, RoadmapItem, Step } from './types';
import { toKata, type QuizMode } from '@/lib/kana';

export const STEPS = raw as Step[];

export const ROADMAP: RoadmapItem[] = [
  ...STEPS.map((s) => ({ n: s.id, t: s.title, row: s.row, note: s.note, part: s.part })),
  // 還沒加進網站的下一課：學習路線最後顯示「下一站」
  { n: STEPS.length + 1, t: '初級1 第 1 課 レストランで働いています', row: '初級1', note: '準備中', part: '下一站', ext: true },
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

/** 假名的最後一步：通過這一步後要先考五十音大會考，才會解鎖課本第 1 課 */
export const KANA_LAST = Math.max(...STEPS.filter((s) => s.kind !== 'phrase').map((s) => s.id));
/** 這一步屬於課本第幾課（看 part 或出處的「第N課」）；假名的步驟是 0 */
const LESSON_RE = /^第(\d+)課/;
export const lessonOf = (s: Step) => Number(LESSON_RE.exec(s.part)?.[1] ?? LESSON_RE.exec(s.source ?? '')?.[1] ?? 0);
/** 入門（A1）的最後一步：第 1～18 課，加上漢字總複習、教室の日本語；之後加的初級步驟 part 會以「初級」開頭 */
export const A1_LAST = Math.max(...STEPS.filter((s) => !s.part.startsWith('初級')).map((s) => s.id));

/** 大會考：接在某一步後面，通過才會解鎖下一步 */
export interface Exam {
  id: string;
  /** 接在第幾步後面 */
  after: number;
  title: string;
  /** 考試範圍的說明 */
  scope: string;
  /** 「〜學完了」 */
  done: string;
  /** 通過後的好處，例如「就能進入課本第 1 課」 */
  reward: string;
  passMsg: string;
  /** 學習路線上的註解 */
  road: string;
  n: number;
  pass: number;
  /** 依單元（或每一課）分組的出題範圍 */
  groups: { part: string; kana: KanaItem[] }[];
  /** 每一題的題型 */
  mode: (a: KanaItem) => QuizMode;
}

const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;

/** 課本第 1～18 課的題目，每一課一組（漢字總複習的步驟算在原本那一課） */
function lessonGroups() {
  return Array.from({ length: 18 }, (_, i) => {
    const n = i + 1;
    const ids = new Set(STEPS.filter((s) => lessonOf(s) === n).map((s) => s.id));
    const part = STEPS.find((s) => LESSON_RE.exec(s.part)?.[1] === String(n))?.part ?? `第${n}課`;
    return { part, kana: ALL_KANA.filter((k) => ids.has(k.step)) };
  });
}

/** 第 from～to 步的題目，依 part 分組 */
function groupsOf(from: number, to: number) {
  const parts = [...new Set(STEPS.filter((s) => s.id >= from && s.id <= to).map((s) => s.part))];
  return parts.map((part) => ({ part, kana: ALL_KANA.filter((k) => k.step >= from && k.step <= to && STEPS[k.step - 1]!.part === part) }));
}

export const EXAMS: Exam[] = [
  {
    id: 'kana',
    after: KANA_LAST,
    title: '五十音大會考',
    scope: '平假名、濁音、長音・促音・拗音、片假名、片假名的濁音和小字，每個單元各考 6 題',
    done: '假名全部學完了',
    reward: '就能進入課本第 1 課',
    passMsg: '恭喜通過五十音大會考！假名的基礎很穩了，可以開始學課本第 1 課。',
    road: '通過才進入課本',
    n: 30,
    pass: 27,
    groups: groupsOf(1, KANA_LAST),
    mode: () => pick(['k2r', 'a2k', 'r2k'] as const),
  },
  {
    id: 'a1',
    after: A1_LAST,
    title: '入門大會考',
    scope: '課本第 1～18 課（包括漢字）每一課各考 2 題：聽錄音選意思、看句子或漢字選意思、聽錄音選句子',
    done: '入門 18 課全部學完了',
    reward: '就完成《いろどり》入門（A1）',
    passMsg: '恭喜通過入門大會考！《いろどり》入門（A1）結業了，生活中最基本的日文你都能聽、能說了。',
    road: '通過就從入門結業',
    n: 36,
    pass: 32,
    groups: lessonGroups(),
    // 有課本錄音的句子才出聽力題
    mode: (a) => (a.audio ? pick(['a2z', 'k2z', 'a2k'] as const) : 'k2z'),
  },
];

/** 課本的生活文化專欄（第 1～18 課） */
export const CULTURE = rawCulture as Culture[];

/** 課本的 79 項 Can-do */
export const CANDO = rawCando as CanDo[];

/** 這項 Can-do 要回去複習哪一步：出處寫著同一個活動名稱的那一步，找不到就用那一課的第一步 */
export function candoStep(c: CanDo): number {
  const norm = (t: string) => t.replace(/\s/g, '');
  const ofLesson = STEPS.filter((s) => lessonOf(s) === c.lesson && s.part !== '入門漢字總複習');
  const hit = ofLesson.find((s) => norm(s.source ?? '').includes(norm(c.title)));
  return (hit ?? ofLesson[0])!.id;
}

export function stepLabel(n: number): string {
  const s = STEPS.find((x) => x.id === n);
  if (s) return s.row;
  const r = ROADMAP.find((x) => x.n === n);
  return r ? r.row || r.t : '';
}
