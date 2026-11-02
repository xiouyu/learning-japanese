/* 課本的生活文化專欄（第 1～18 課）：學習頁打開專欄時才載入 */
import rawCulture from './culture.json';
import type { Culture } from './types';

export const CULTURE = rawCulture as Culture[];
