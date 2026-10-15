import { ref, watch } from 'vue';
import { Notify } from 'quasar';
import { voiceScore } from '@/lib/voice';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let jaVoice: SpeechSynthesisVoice | null = null;
let started = false;

/** 頁面上方的提示：不支援語音或找不到日文語音 */
export const voiceWarning = ref('');

/** iPhone / iPad：網頁指定語音時會蓋掉「設定 › 輔助使用 › 朗讀內容」裡選的語音 */
export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** 這台裝置的日文語音（分數高的在前面） */
export const jaVoices = ref<SpeechSynthesisVoice[]>([]);

/**
 * 使用者選的語音：'auto' 自動（iPhone 跟著系統設定，其他裝置挑最自然的），
 * 'system' 一律跟著系統設定，其他值是某個語音的 voiceURI。
 * 每台裝置的語音不一樣，所以只存在這台裝置，不跟著登入同步。
 */
const VOICE_KEY = 'gojuon:voice';
function loadChoice() {
  try {
    return localStorage.getItem(VOICE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}
export const voiceChoice = ref(loadChoice());
watch(voiceChoice, (v) => {
  try {
    localStorage.setItem(VOICE_KEY, v);
  } catch {
    /* 無痕模式等情況存不了，就只在這次有效 */
  }
});

function pickVoice() {
  const vs = speechSynthesis.getVoices();
  const ja = vs.filter((v) => /^ja/i.test(v.lang));
  jaVoices.value = [...ja].sort((a, b) => voiceScore(b) - voiceScore(a));
  jaVoice = jaVoices.value[0] ?? null;
  return vs.length;
}

/** 實際要用的語音；null 表示不指定，交給系統 */
function currentVoice(): SpeechSynthesisVoice | null {
  const c = voiceChoice.value;
  if (c === 'system') return null;
  if (c === 'auto') return isIOS ? null : jaVoice;
  return jaVoices.value.find((v) => v.voiceURI === c) ?? (isIOS ? null : jaVoice);
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
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = 0.8;
    speechSynthesis.speak(u);
  } catch {
    Notify.create({ message: '無法播放語音' });
  }
}
