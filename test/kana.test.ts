import { describe, expect, it } from 'vitest';
import { ALL_KANA, BASE, BASE_K, STEPS } from '@/data';
import { makeQs, snd, toKata } from '@/lib/kana';

describe('教材資料', () => {
  it('步驟 id 從 1 開始連續', () => {
    STEPS.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it('每一步都有假名和說明', () => {
    for (const s of STEPS) {
      expect(s.kana.length, `第 ${s.id} 步`).toBeGreaterThan(0);
      expect(s.rule, `第 ${s.id} 步`).not.toBe('');
      for (const k of s.kana) expect(k.k && k.r && k.z, `第 ${s.id} 步 ${k.k}`).toBeTruthy();
    }
  });

  it('五十音表有 46 個平假名和片假名', () => {
    expect(BASE.size).toBe(46);
    expect(BASE_K.size).toBe(46);
    expect(toKata('あいうえお')).toBe('アイウエオ');
  });
});

describe('出題', () => {
  it('每一步的解鎖測驗都能出 10 題，選項不重複也不同音', () => {
    for (const s of STEPS) {
      const P = ALL_KANA.filter((k) => k.step === s.id);
      const D = ALL_KANA.filter((k) => k.step <= s.id && k.step >= s.id - 1);
      for (let round = 0; round < 20; round++) {
        const qs = makeQs(P, () => 'k2r', D);
        expect(qs).toHaveLength(10);
        for (const q of qs) {
          expect(q.opts).toContain(q.a);
          expect(new Set(q.opts.map(snd)).size).toBe(q.opts.length);
          expect(q.opts.length).toBeGreaterThanOrEqual(Math.min(4, new Set(D.map(snd)).size));
        }
      }
    }
  });

  it('連續兩題不會是同一個字', () => {
    const P = ALL_KANA.filter((k) => k.step === 1);
    for (let round = 0; round < 50; round++) {
      const qs = makeQs(P, () => 'r2k');
      for (let i = 1; i < qs.length; i++) expect(qs[i]!.a.k).not.toBe(qs[i - 1]!.a.k);
    }
  });
});

describe('課本音檔', () => {
  it('資料裡用到的音檔都存在，剪輯的時間合理', async () => {
    const { existsSync } = await import('node:fs');
    const refs = STEPS.flatMap((s) => [
      ...s.kana.map((k) => k.audio),
      ...s.words.map((w) => w.audio),
      ...(s.dialogs ?? []).map((d) => d.audio),
    ]).filter((a) => a !== undefined);
    expect(refs.length).toBeGreaterThan(0);
    for (const a of refs) {
      expect(existsSync(`public/${a.src}`), a.src).toBe(true);
      if (a.end !== undefined) expect(a.end, a.src).toBeGreaterThan(a.start ?? 0);
    }
  });
});
