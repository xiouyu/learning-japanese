import { describe, expect, it } from 'vitest';
import { A1_LAST, ALL_KANA, BASE, BASE_K, EXAMS, KANA_LAST, STEPS } from '@/data';
import { gist, isMeaning, makeExam, makeQs, snd, toKata } from '@/lib/kana';

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

describe('大會考', () => {
  const kana = EXAMS.find((e) => e.id === 'kana')!;
  const a1 = EXAMS.find((e) => e.id === 'a1')!;

  it('五十音大會考接在假名最後一步，分成 5 個單元', () => {
    expect(kana.after).toBe(KANA_LAST);
    expect(KANA_LAST).toBe(33);
    expect(kana.groups.map((g) => g.part)).toEqual(['平假名', '濁音・半濁音', '長音・促音・拗音', '片假名', '片假名的濁音和小字']);
    expect(kana.groups.flatMap((g) => g.kana)).toHaveLength(ALL_KANA.filter((k) => k.step <= KANA_LAST).length);
  });

  it('入門大會考接在第 18 課最後一步，每一課一組', () => {
    expect(a1.after).toBe(A1_LAST);
    expect(a1.groups).toHaveLength(18);
    expect(a1.groups[0]!.part).toMatch(/^第1課/);
    expect(a1.groups[17]!.part).toMatch(/^第18課/);
    expect(a1.groups.flatMap((g) => g.kana).every((k) => k.step > KANA_LAST && k.step <= A1_LAST)).toBe(true);
  });

  it('gist 取中文說明的第一句', () => {
    expect(gist('不用了，謝謝。（第 5 課學過）')).toBe('不用了，謝謝');
    expect(gist('這個多少錢？「いくら」＝多少錢。')).toBe('這個多少錢？');
    expect(gist('沒有句號')).toBe('沒有句號');
  });

  for (const e of EXAMS) {
    it(`${e.title}：每個單元平均出題，選項不同音、意思題的選項意思不重複，同一題不會連續出現`, () => {
      const per = e.n / e.groups.length;
      for (let round = 0; round < 50; round++) {
        const qs = makeExam(
          e.groups.map((g) => g.kana),
          e.mode,
          e.n,
        );
        expect(qs).toHaveLength(e.n);
        for (const g of e.groups) {
          const steps = new Set(g.kana.map((k) => k.step));
          expect(qs.filter((q) => steps.has(q.a.step))).toHaveLength(per);
        }
        qs.forEach((q, i) => {
          expect(q.opts).toHaveLength(4);
          expect(new Set(q.opts.map(snd)).size).toBe(4);
          if (isMeaning(q.m)) expect(new Set(q.opts.map((o) => gist(o.z))).size).toBe(4);
          // 聽力題只出有課本錄音的句子
          if (e.id === 'a1' && (q.m === 'a2k' || q.m === 'a2z')) expect(q.a.audio).toBeTruthy();
          if (i) expect(q.a.k).not.toBe(qs[i - 1]!.a.k);
        });
      }
    });
  }
});
