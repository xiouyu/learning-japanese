import { describe, expect, it } from 'vitest';
import { emptyProgress, mergeProgress, normalize } from '@/lib/progress';

const MAX = 33;

describe('normalize', () => {
  it('把壞掉或超出範圍的資料修正成合法值', () => {
    const d = normalize(
      { passed: 99, step: -3, scope: [0, 2, 2, 50, 1] as number[], mastery: { あ: 2, い: -1 }, qmode: 'xx' as never },
      MAX,
    );
    expect(d.passed).toBe(MAX);
    expect(d.step).toBe(1);
    expect(d.scope).toEqual([1, 2]);
    expect(d.mastery).toEqual({ あ: 2 });
    expect(d.qmode).toBe('k2r');
  });

  it('測驗題數只接受可以選的值，舊資料沒有就用 10 題', () => {
    expect(normalize({ qn: 30 }, MAX).qn).toBe(30);
    expect(normalize({ qn: 0 }, MAX).qn).toBe(0);
    expect(normalize({ qn: 7 }, MAX).qn).toBe(10);
    expect(normalize({}, MAX).qn).toBe(10);
  });

  it('弱點分數只留正整數、最多 10；出題方式不認得就用平均出題', () => {
    const d = normalize({ weak: { あ: 3, い: 0, う: -2, え: 99, お: 'x' as never }, qpick: 'zz' as never }, MAX);
    expect(d.weak).toEqual({ あ: 3, え: 10 });
    expect(d.qpick).toBe('even');
    expect(normalize({ qpick: 'weak' }, MAX).qpick).toBe('weak');
    expect(normalize({ qn: -1 }, MAX).qn).toBe(-1);
  });

  it('學習紀錄只留合法的日期和正整數', () => {
    const d = normalize({ daily: { '2026-10-19': 3, bad: 2, '2026-10-18': 0 }, seen: { あ: 5, い: -1 }, review: 'x' as never }, MAX);
    expect(d.daily).toEqual({ '2026-10-19': 3 });
    expect(d.seen).toEqual({ あ: 5 });
    expect(d.review).toBe('');
  });

  it('Can-do 自我評價只留 1～3 顆星', () => {
    expect(normalize({ cando: { 1: 3, 2: 0, 3: 4, x: 2, 5: '2' as never } }, MAX).cando).toEqual({ 1: 3, 5: 2 });
  });

  it('沒有資料時回傳初始值', () => {
    expect(normalize(null, MAX)).toEqual(emptyProgress());
  });

  it('大會考紀錄：讀得懂舊版的 exam，已經學過大會考之後步驟的人當作考過', () => {
    const gates = [
      { id: 'kana', after: 33 },
      { id: 'a1', after: 153 },
    ];
    expect(normalize({ passed: 40 }, 153, gates).exams).toEqual(['kana']);
    expect(normalize({ passed: 33 }, 153, gates).exams).toEqual([]);
    expect(normalize({ passed: 33, exam: true } as never, 153, gates).exams).toEqual(['kana']);
    expect(normalize({ passed: 33, exam: 'yes' } as never, 153, gates).exams).toEqual([]);
    expect(normalize({ passed: 153, exams: ['a1', 'kana', 'a1', 3] as never }, 153, gates).exams).toEqual(['a1', 'kana']);
  });
});

describe('mergeProgress', () => {
  const phone = { ...emptyProgress(), passed: 5, step: 6, scope: [6], mastery: { あ: 3, か: 1 }, qmode: 'a2k' as const, updatedAt: 200 };
  const laptop = { ...emptyProgress(), passed: 3, step: 2, scope: [1, 2], mastery: { あ: 1, さ: 4 }, tmode: 'kata' as const, updatedAt: 100 };

  it('進度和熟練度取較大的值，不會倒退', () => {
    const m = mergeProgress(laptop, phone);
    expect(m.passed).toBe(5);
    expect(m.mastery).toEqual({ あ: 3, か: 1, さ: 4 });
  });

  it('偏好設定以最後修改的裝置為準', () => {
    const m = mergeProgress(laptop, phone);
    expect(m.step).toBe(6);
    expect(m.scope).toEqual([6]);
    expect(m.qmode).toBe('a2k');
    expect(m.tmode).toBe('hira');
    expect(m.updatedAt).toBe(200);
  });

  it('任一邊通過的大會考都算通過', () => {
    expect(mergeProgress({ ...laptop, exams: ['kana'] }, { ...phone, exams: ['a1'] }).exams).toEqual(['a1', 'kana']);
    expect(mergeProgress(laptop, phone).exams).toEqual([]);
  });

  it('弱點分數和出題方式以最後修改的裝置為準', () => {
    const m = mergeProgress({ ...laptop, weak: { あ: 4 }, qpick: 'weak' }, { ...phone, weak: { か: 2 } });
    expect(m.weak).toEqual({ か: 2 });
    expect(m.qpick).toBe('even');
  });

  it('Can-do 自我評價以最後修改的裝置為準（可以改高也可以改低）', () => {
    expect(mergeProgress({ ...laptop, cando: { 1: 1 } }, { ...phone, cando: { 1: 3, 2: 2 } }).cando).toEqual({ 1: 3, 2: 2 });
  });

  it('每天的題數和最後練習的日子取較大值，今日複習的日期取較新的', () => {
    const m = mergeProgress(
      { ...laptop, daily: { '2026-10-18': 5, '2026-10-19': 2 }, seen: { あ: 100 }, review: '2026-10-18' },
      { ...phone, daily: { '2026-10-19': 7 }, seen: { あ: 90, い: 95 }, review: '2026-10-19' },
    );
    expect(m.daily).toEqual({ '2026-10-18': 5, '2026-10-19': 7 });
    expect(m.seen).toEqual({ あ: 100, い: 95 });
    expect(m.review).toBe('2026-10-19');
  });

  it('順序不影響結果', () => {
    expect(mergeProgress(laptop, phone)).toEqual(mergeProgress(phone, laptop));
  });
});
