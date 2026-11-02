/* 課本的 79 項 Can-do：只有檢核分頁用到，跟著那一頁載入 */
import rawCando from './cando.json';
import { STEPS, lessonOf } from './index';
import type { CanDo } from './types';

export const CANDO = rawCando as CanDo[];

/** 這項 Can-do 要回去複習哪一步：出處寫著同一個活動名稱的那一步，找不到就用那一課的第一步 */
export function candoStep(c: CanDo): number {
  const norm = (t: string) => t.replace(/\s/g, '');
  const ofLesson = STEPS.filter((s) => lessonOf(s) === c.lesson && s.part !== '入門漢字總複習');
  const hit = ofLesson.find((s) => norm(s.source ?? '').includes(norm(c.title)));
  return (hit ?? ofLesson[0])!.id;
}
