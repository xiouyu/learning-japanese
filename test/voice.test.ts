import { describe, expect, it } from 'vitest';
import { voiceScore } from '@/lib/voice';

const v = (name: string, voiceURI = name) => ({ name, voiceURI });
const best = (vs: ReturnType<typeof v>[]) => vs.reduce((a, b) => (voiceScore(b) > voiceScore(a) ? b : a)).name;

describe('voiceScore', () => {
  it('iPhone：不選 Eddy、Grandma 這類趣味語音', () => {
    expect(best([v('Eddy (日本語)', 'com.apple.eloquence.ja-JP.Eddy'), v('Grandma (日本語)', 'com.apple.eloquence.ja-JP.Grandma'), v('Kyoko', 'com.apple.voice.compact.ja-JP.Kyoko')])).toBe('Kyoko');
  });
  it('iPhone：有下載增強版就用增強版', () => {
    expect(best([v('Kyoko', 'com.apple.voice.compact.ja-JP.Kyoko'), v('Otoya', 'com.apple.voice.enhanced.ja-JP.Otoya')])).toBe('Otoya');
  });
  it('電腦：優先用 Google / Microsoft 線上語音', () => {
    expect(best([v('Microsoft Haruka - Japanese (Japan)'), v('Microsoft Nanami Online (Natural) - Japanese (Japan)'), v('Google 日本語')])).toBe('Microsoft Nanami Online (Natural) - Japanese (Japan)');
  });
});
