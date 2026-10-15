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

  it('沒有資料時回傳初始值', () => {
    expect(normalize(null, MAX)).toEqual(emptyProgress());
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

  it('順序不影響結果', () => {
    expect(mergeProgress(laptop, phone)).toEqual(mergeProgress(phone, laptop));
  });
});
