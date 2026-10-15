import { ref } from 'vue';
import { Notify } from 'quasar';
import { voiceScore } from '@/lib/voice';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let jaVoice: SpeechSynthesisVoice | null = null;
let started = false;

/** 頁面上方的提示：不支援語音或找不到日文語音 */
export const voiceWarning = ref('');

function pickVoice() {
  const vs = speechSynthesis.getVoices();
  const ja = vs.filter((v) => /^ja/i.test(v.lang));
  jaVoice = ja.reduce<SpeechSynthesisVoice | null>((best, v) => (!best || voiceScore(v) > voiceScore(best) ? v : best), null);
  return vs.length;
}

function checkVoices() {
  if (!supported) {
    voiceWarning.value = '這個瀏覽器不支援語音播放，建議改用 Chrome 或 Edge。';
    return;
  }
  const n = pickVoice();
  voiceWarning.value =
    n && !jaVoice
      ? '找不到日文語音，發音可能不正確。Windows 可到「設定 › 時間與語言 › 語音」新增日文語音，或改用 Edge / Chrome 開啟。'
      : '';
}

/** 啟動語音偵測（只需要呼叫一次） */
export function initSpeech() {
  if (started) return;
  started = true;
  if (supported) speechSynthesis.onvoiceschanged = checkVoices;
  setTimeout(checkVoices, 1500);
}

/** 用日文語音唸出文字 */
export function speak(text: string) {
  if (!supported) {
    Notify.create({ message: '這個瀏覽器不支援語音播放' });
    return;
  }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.8;
    speechSynthesis.speak(u);
  } catch {
    Notify.create({ message: '無法播放語音' });
  }
}
