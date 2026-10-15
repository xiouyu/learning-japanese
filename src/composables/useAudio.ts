import type { AudioRef } from '@/data/types';
import { speak } from './useSpeech';

let player: HTMLAudioElement | null = null;
let stopAt: number | null = null;

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
  const start = () => {
    player!.currentTime = ref.start ?? 0;
    player!.play().catch(() => {
      if (fallbackText) speak(fallbackText);
    });
  };
  if (player.readyState >= 1) start();
  else player.addEventListener('loadedmetadata', start, { once: true });
}

/** 有課本錄音就播錄音，沒有就用語音合成唸 */
export function say(item: { audio?: AudioRef | undefined }, text: string) {
  if (item.audio) playAudio(item.audio, text);
  else speak(text);
}
