import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { ALL_KANA, EXAMS, STEPS } from '@/data';
import { WEAK_MAX, WEAK_MISS, type QuizMode, type QuizPick } from '@/lib/kana';
import { loadLocal, saveLocal, type ProgressData } from '@/lib/progress';

/**
 * 個人進度：存在這台裝置的 localStorage；登入後會跟雲端同步（見 stores/sync.ts）。
 * passed = 已經通過解鎖測驗的步數；curU = 目前能學到第幾步。
 * 大會考（EXAMS）接在某一步後面：例如假名學完後要通過五十音大會考，才會解鎖課本第 1 課。
 */
export const useProgressStore = defineStore('progress', () => {
  const MAX = STEPS.length;
  const d = ref<ProgressData>(loadLocal(MAX, EXAMS));
  /** 學習頁目前選的字（不需要保存） */
  const curKana = ref(0);

  const examPassed = (id: string) => d.value.exams.includes(id);
  /** 還沒通過的大會考會擋住後面的步驟 */
  const curU = computed(() => Math.min(d.value.passed + 1, MAX, ...EXAMS.filter((e) => !examPassed(e.id)).map((e) => e.after)));
  /** 前面的步驟都通過了，正在等的大會考 */
  const examDue = computed(() => EXAMS.find((e) => !examPassed(e.id) && d.value.passed >= e.after) ?? null);
  const availSet = computed(() => new Set(ALL_KANA.filter((k) => k.step <= curU.value).map((k) => k.k)));
  /** 字卡、測驗的出題範圍 */
  const pool = computed(() => ALL_KANA.filter((k) => d.value.scope.includes(k.step) && k.step <= curU.value));

  /** 標記修改時間；至少比目前紀錄新 1 毫秒，避免裝置時鐘不準時新的修改被舊資料蓋掉 */
  const touch = () => {
    d.value.updatedAt = Math.max(Date.now(), d.value.updatedAt + 1);
  };

  /** 新解鎖一步時：學習頁跳到最新一步，練習範圍加入新的一行 */
  function syncNew() {
    const U = curU.value;
    const p = d.value;
    if (U > p.lastU) {
      p.step = U;
      curKana.value = 0;
      for (const s of STEPS) if (s.id > p.lastU && s.id <= U && !p.scope.includes(s.id)) p.scope.push(s.id);
      p.lastU = U;
    }
    // 舊版沒有大會考時記下的 lastU 可能比現在能學的還大
    if (p.lastU > U) p.lastU = U;
    p.scope = p.scope.filter((id) => id <= U);
    if (!p.scope.length) p.scope = STEPS.filter((s) => s.id <= U).map((s) => s.id);
    p.scope.sort((a, b) => a - b);
    if (p.step > U || p.step < 1) p.step = U;
  }

  function setStep(id: number) {
    d.value.step = id;
    curKana.value = 0;
    touch();
  }

  /** 通過第 id 步的解鎖測驗 */
  function pass(id: number) {
    if (id <= d.value.passed) return;
    d.value.passed = Math.min(id, MAX);
    touch();
    syncNew();
  }

  /** 通過大會考 */
  function passExam(id: string) {
    if (examPassed(id)) return;
    d.value.exams = [...d.value.exams, id].sort();
    touch();
    syncNew();
  }

  function setScope(ids: number[]) {
    d.value.scope = [...ids].sort((a, b) => a - b);
    touch();
  }

  function addMastery(k: string) {
    d.value.mastery[k] = (d.value.mastery[k] ?? 0) + 1;
    touch();
  }

  function setQmode(m: QuizMode) {
    d.value.qmode = m;
    touch();
  }

  /** 記錄測驗的作答：答錯弱點分數 +2，答對 -1 */
  function recordAnswer(k: string, right: boolean) {
    const w = d.value.weak;
    const v = Math.max(0, Math.min(WEAK_MAX, (w[k] ?? 0) + (right ? -1 : WEAK_MISS)));
    if (v) w[k] = v;
    else delete w[k];
    touch();
  }

  function setQpick(m: QuizPick) {
    d.value.qpick = m;
    touch();
  }

  function setQn(n: number) {
    d.value.qn = n;
    touch();
  }

  function setTmode(m: 'hira' | 'kata') {
    d.value.tmode = m;
    touch();
  }

  /** 同步時用合併後的資料取代本機資料 */
  function replace(next: ProgressData) {
    const prevStep = d.value.step;
    d.value = JSON.parse(JSON.stringify(next)) as ProgressData;
    if (d.value.step !== prevStep) curKana.value = 0;
    syncNew();
  }

  const snapshot = (): ProgressData => JSON.parse(JSON.stringify(d.value)) as ProgressData;

  syncNew();
  watch(d, (v) => saveLocal(v), { deep: true, immediate: true });

  return { d, curKana, curU, examPassed, examDue, availSet, pool, syncNew, setStep, pass, passExam, setScope, addMastery, setQmode, setQn, setQpick, recordAnswer, setTmode, replace, snapshot };
});
