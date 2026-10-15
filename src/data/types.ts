/** 一個假名（或拗音、長音的範例詞）的教材資料 */
export interface Kana {
  /** 假名本身 */
  k: string;
  /** 羅馬拼音 */
  r: string;
  /** 發音說明（對照注音） */
  z: string;
  /** 來源漢字，或「か＋゛」這類組成說明 */
  o?: string;
  /** `o` 前面的標籤文字，沒填就顯示「來源」 */
  ol?: string;
  /** 例外的字，字卡右上角顯示「例外」 */
  ex?: boolean;
  /** 實際發音（例如 を 填 o），測驗時同音字不會出現在同一題 */
  snd?: string;
}

export interface Word {
  w: string;
  r: string;
  m: string;
}

export interface Step {
  id: number;
  row: string;
  title: string;
  part: string;
  kind: 'hira' | 'kata';
  rule: string;
  kana: Kana[];
  notes: string[];
  words: Word[];
  /** 學習路線上的小註解 */
  note?: string;
}

export interface RoadmapItem {
  n: number;
  t: string;
  row: string;
  part: string;
  note?: string | undefined;
  /** 課本，不是網站裡的步驟 */
  ext?: boolean;
}

export type KanaItem = Kana & { step: number };

/** 五十音表的一行：[行名, 5 格（空格為 null）, 第幾步學到] */
export type GojuonRow = [string, ([string, string] | null)[], number];
