import type { AudioRef } from '@/data/types';
import { speak } from './useSpeech';

let player: HTMLAudioElement | null = null;
let stopAt: number | null = null;
let token = 0;

function onTime() {
  if (player && stopAt !== null && player.currentTime >= stopAt) {
    player.pause();
    stopAt = null;
  }
}

/** 播放課本音檔（可以只播其中一段）；播放失敗時退回語音合成 */
export function playAudio(ref: AudioRef, fallbackText?: string) {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.addEventListener('timeupdate', onTime);
  }
  speechSynthesis?.cancel?.();
  player.pause();
  // 相對路徑：網站放在子路徑（例如 /learning-japanese/）也找得到
  if (!player.src.endsWith(ref.src)) player.src = ref.src;
  stopAt = ref.end ?? null;
  const p = player;
  const my = ++token;
  const begin = ref.start ?? 0;
  const fail = () => {
    p.muted = false;
    if (my === token && fallbackText) speak(fallbackText);
  };
  if (p.readyState >= 1) {
    p.muted = false;
    p.currentTime = begin;
    p.play().catch(fail);
    return;
  }
  // 還沒載入：iPhone 只允許在點擊的當下呼叫 play()，等載入完才播會被擋掉。
  // 所以先播放；要從中間開始的片段先靜音，跳到開始位置後再打開聲音。
  p.muted = begin > 0;
  p.addEventListener(
    'loadedmetadata',
    () => {
      if (my !== token || begin === 0) return;
      p.addEventListener('seeked', () => my === token && (p.muted = false), { once: true });
      p.currentTime = begin;
    },
    { once: true },
  );
  p.play().catch(fail);
}

/** 有課本錄音就播錄音，沒有就用語音合成唸 */
export function say(item: { audio?: AudioRef | undefined }, text: string) {
  if (item.audio) playAudio(item.audio, text);
  else speak(text);
}
