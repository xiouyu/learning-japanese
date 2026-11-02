/**
 * 教材只維護 src/data/steps.json 一個檔，建置時拆成兩部分：
 * - virtual:steps-core：所有步驟的假名、單字、標題…（測驗、字卡、進度都要用，跟著主程式一起載入）
 * - virtual:steps-detail：會話和重點說明（只有學習頁的那一步才看得到），依單元拆成小檔，用到才下載
 */
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const CORE = 'virtual:steps-core';
const DETAIL = 'virtual:steps-detail';
const PART = `${DETAIL}/`;

interface RawStep {
  id: number;
  part: string;
  notes?: unknown;
  dialogs?: unknown;
  [k: string]: unknown;
}

/** 大的 JSON 用 JSON.parse 載入比較快 */
const asModule = (v: unknown) => `export default JSON.parse(${JSON.stringify(JSON.stringify(v))});`;

export default function stepsSplit(file: string): Plugin {
  const read = () => JSON.parse(readFileSync(file, 'utf8')) as RawStep[];
  const parts = (steps: RawStep[]) => [...new Set(steps.map((s) => s.part))];
  return {
    name: 'steps-split',
    resolveId(id) {
      if (id === CORE || id === DETAIL || id.startsWith(PART)) return '\0' + id;
    },
    load(id) {
      if (!id.startsWith('\0virtual:steps-')) return;
      this.addWatchFile(file);
      const steps = read();
      const vid = id.slice(1);
      if (vid === CORE) return asModule(steps.map(({ notes: _n, dialogs: _d, ...s }) => s));
      if (vid === DETAIL) {
        const ps = parts(steps);
        const loaders = ps.map((_, i) => `() => import(${JSON.stringify(PART + i)})`).join(',\n');
        const map = Object.fromEntries(steps.map((s) => [s.id, ps.indexOf(s.part)]));
        return `const L = [\n${loaders}\n];\nconst M = ${JSON.stringify(map)};\nexport default (id) => (M[id] === undefined ? Promise.resolve({ default: {} }) : L[M[id]]());`;
      }
      if (vid.startsWith(PART)) {
        const part = parts(steps)[Number(vid.slice(PART.length))];
        const detail = Object.fromEntries(
          steps.filter((s) => s.part === part).map((s) => [s.id, { notes: s.notes ?? [], ...(s.dialogs ? { dialogs: s.dialogs } : {}) }]),
        );
        return asModule(detail);
      }
    },
  };
}
