import { QN, QN_OPTS, type QuizMode } from './kana';

/** 要存起來、跨裝置同步的學習紀錄 */
export interface ProgressData {
  /** 已經通過解鎖測驗的步數 */
  passed: number;
  /** 通過的大會考（例如 'kana'：五十音大會考，'a1'：入門大會考） */
  exams: string[];
  /** 學習頁正在看第幾步 */
  step: number;
  /** 字卡、測驗的練習範圍（步驟 id） */
  scope: number[];
  /** 上次看到的「目前可學到第幾步」，用來偵測新解鎖 */
  lastU: number;
  /** 字卡按「記住了」的次數 */
  mastery: Record<string, number>;
  qmode: QuizMode;
  /** 一般測驗的題數（0 = 範圍裡的全部各考一次） */
  qn: number;
  tmode: 'hira' | 'kata';
  /** 最後修改時間（毫秒），合併時用來決定偏好設定以哪一邊為準 */
  updatedAt: number;
}

export const emptyProgress = (): ProgressData => ({
  passed: 0,
  exams: [],
  step: 1,
  scope: [],
  lastU: 0,
  mastery: {},
  qmode: 'k2r',
  qn: QN,
  tmode: 'hira',
  updatedAt: 0,
});

const KEY = 'gojuon:';
const QMODES: QuizMode[] = ['k2r', 'a2k', 'r2k'];

function read<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(KEY + k);
    return v == null ? d : (JSON.parse(v) as T);
  } catch {
    return d;
  }
}

function write(k: string, v: unknown) {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {
    /* 私密瀏覽或空間不足時就不存 */
  }
}

/** 大會考：id 和接在第幾步後面 */
export interface Gate {
  id: string;
  after: number;
}

/** 舊版的紀錄：exam: true 代表通過了五十音大會考 */
type RawProgress = Partial<ProgressData> & { exam?: unknown };

/**
 * 把任何來源（localStorage、雲端）的資料整理成合法的 ProgressData。
 * gates 是各個大會考接在第幾步後面：沒有紀錄但已經學過那一步之後的人，當作考過了。
 */
export function normalize(raw: RawProgress | null | undefined, maxStep: number, gates: Gate[] = []): ProgressData {
  const d = emptyProgress();
  if (!raw) return d;
  const int = (v: unknown, lo: number, hi: number, dflt: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
  };
  d.passed = int(raw.passed, 0, maxStep, 0);
  const exams = new Set(Array.isArray(raw.exams) ? raw.exams.filter((x): x is string => typeof x === 'string' && x !== '') : []);
  if (raw.exam === true) exams.add('kana');
  for (const g of gates) if (d.passed > g.after) exams.add(g.id);
  d.exams = [...exams].sort();
  d.step = int(raw.step, 1, maxStep, 1);
  d.lastU = int(raw.lastU, 0, maxStep, 0);
  d.scope = Array.isArray(raw.scope)
    ? [...new Set(raw.scope.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= maxStep))].sort((a, b) => a - b)
    : [];
  if (raw.mastery && typeof raw.mastery === 'object') {
    for (const [k, v] of Object.entries(raw.mastery)) {
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n > 0) d.mastery[k] = n;
    }
  }
  d.qmode = QMODES.includes(raw.qmode as QuizMode) ? (raw.qmode as QuizMode) : 'k2r';
  d.qn = (QN_OPTS as readonly number[]).includes(Number(raw.qn)) ? Number(raw.qn) : QN;
  d.tmode = raw.tmode === 'kata' ? 'kata' : 'hira';
  d.updatedAt = Number(raw.updatedAt) || 0;
  return d;
}

/** 讀取這台裝置上的紀錄（相容單一 HTML 版本留下的 key） */
export function loadLocal(maxStep: number, gates: Gate[] = []): ProgressData {
  let passed = read<number | null>('passed', null);
  if (passed === null) {
    const legacy = read('seen', 0); // 更早的版本：當時正在學第 seen 步
    passed = legacy > 0 ? legacy - 1 : 0;
  }
  return normalize(
    {
      passed,
      exams: read('exams', []),
      exam: read('exam', false),
      step: read('step', 1),
      scope: read('scope', []),
      lastU: read('lastU', 0),
      mastery: read('mastery', {}),
      qmode: read('qmode', 'k2r'),
      qn: read('qn', QN),
      tmode: read('tmode', 'hira'),
      updatedAt: read('updatedAt', 0),
    },
    maxStep,
    gates,
  );
}

export function saveLocal(d: ProgressData) {
  for (const [k, v] of Object.entries(d)) write(k, v);
}

/**
 * 合併兩台裝置的紀錄：
 * - 進度、大會考和熟練度只會增加，取兩邊較大的值，不會因為同步而倒退
 * - 練習範圍、測驗模式這類偏好，以最後修改的那一邊為準
 */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const newer = b.updatedAt > a.updatedAt ? b : a;
  const mastery: Record<string, number> = { ...a.mastery };
  for (const [k, v] of Object.entries(b.mastery)) mastery[k] = Math.max(mastery[k] ?? 0, v);
  return {
    passed: Math.max(a.passed, b.passed),
    exams: [...new Set([...a.exams, ...b.exams])].sort(),
    step: newer.step,
    scope: [...newer.scope],
    lastU: Math.max(a.lastU, b.lastU),
    mastery,
    qmode: newer.qmode,
    qn: newer.qn,
    tmode: newer.tmode,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export const sameProgress = (a: ProgressData, b: ProgressData) => JSON.stringify(a) === JSON.stringify(b);
