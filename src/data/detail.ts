/* 每一步的會話和重點說明：建置時依單元拆成小檔（見 build/steps-split.ts），學到那一步才下載 */
import loadPart from 'virtual:steps-detail';
import type { Culture, StepDetail } from './types';

const cache = new Map<number, Promise<StepDetail>>();

/** 讀取某一步的會話和重點；同一個單元只下載一次 */
export function loadDetail(id: number): Promise<StepDetail> {
  let p = cache.get(id);
  if (!p) {
    p = loadPart(id).then((m) => m.default[id] ?? { notes: [] });
    // 下載失敗（例如離線又還沒快取）時，下次再試
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

let cultureP: Promise<Culture[]> | null = null;
/** 文化專欄全部一起載入（約 100KB），第一次用到才下載 */
export function loadCulture(): Promise<Culture[]> {
  cultureP ??= import('./culture').then((m) => m.CULTURE);
  cultureP.catch(() => (cultureP = null));
  return cultureP;
}
