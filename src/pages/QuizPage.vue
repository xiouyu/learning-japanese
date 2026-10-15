<template>
  <section class="panel">
    <div v-if="unlock" class="stephead">
      <div class="eyebrow">解鎖測驗・答對 {{ PASS }} 題以上通過</div>
      <h2 style="font-size: 28px; letter-spacing: 0.08em">第 {{ unlockStep!.id }} 步 {{ unlockStep!.title }}</h2>
    </div>
    <template v-else>
      <ScopeChips @change="start(0)" />
      <div class="hrow" aria-label="測驗模式">
        <button v-for="m in MODES" :key="m.id" class="chip" :aria-pressed="m.id === p.d.qmode" @click="pickMode(m.id)">
          {{ m.t }}
        </button>
      </div>
    </template>

    <!-- 結果 -->
    <div v-if="done" class="result qbox" :class="{ pass: unlock && ok }">
      <div class="score">{{ score }} / {{ qs.length }}</div>
      <p>{{ resultMsg }}</p>
      <div v-if="wrongList.length" class="sec">
        <h3>答錯的字</h3>
        <div class="hrow">
          <button v-for="k in wrongList" :key="k.k" class="chip" @click="say(k, k.k)">
            <span class="kn">{{ k.k }}</span> {{ k.r }}
          </button>
        </div>
      </div>
      <div class="hrow">
        <template v-if="!unlock">
          <button class="btn primary" @click="start(0)">再測一次</button>
        </template>
        <template v-else-if="ok">
          <button v-if="nextHas" class="btn primary" @click="goLearn(unlock + 1)">去學第 {{ unlock + 1 }} 步 →</button>
          <button class="btn" @click="start(0)">回到一般測驗</button>
        </template>
        <template v-else>
          <button class="btn primary" @click="start(unlock)">重考</button>
          <button class="btn" @click="goLearn(unlock)">回去複習這一步</button>
        </template>
      </div>
    </div>

    <!-- 題目 -->
    <div v-else-if="q" class="qbox">
      <div class="counter">第 {{ i + 1 }} / {{ qs.length }} 題・答對 {{ score }}{{ unlock ? '・' + ask : '' }}</div>
      <div class="qprompt">
        <span v-if="q.m === 'k2r'" class="kana" :style="{ fontSize: fitPx(q.a.k, 96, 440) }">{{ q.a.k }}</span>
        <span v-else-if="q.m === 'r2k'" class="mono">{{ q.a.r }}</span>
        <button v-else class="btn primary" style="font-size: 16px; padding: 14px 22px" @click="say(q.a, q.a.k)">
          <SpeakerIcon /> {{ answered ? '再聽一次' : '播放發音' }}
        </button>
      </div>
      <div class="opts" :class="{ single: singleCol }">
        <button
          v-for="o in q.opts"
          :key="o.k"
          class="opt"
          :class="[q.m === 'k2r' ? 'r' : 'k', answered && (o.k === q.a.k ? 'right' : o.k === answered ? 'wrong' : ''), { long: (q.m === 'k2r' ? o.r : o.k).length > 7 }]"
          :disabled="!!answered"
          @click="answer(o.k)"
        >
          {{ q.m === 'k2r' ? o.r : o.k }}
        </button>
      </div>
      <div class="fb" :class="answered ? (answered === q.a.k ? 'good' : 'bad') : ''">
        <template v-if="answered">
          {{ answered === q.a.k ? '答對了' : '答錯了' }}：<span class="kana" style="font-size: 20px">{{ q.a.k }}</span> ＝
          <span class="mono">{{ q.a.r }}</span>，{{ q.a.z }}
        </template>
      </div>
      <div v-if="answered" class="hrow">
        <button class="btn primary" @click="next">{{ i === qs.length - 1 ? '看結果' : '下一題' }} →</button>
      </div>
      <div v-if="unlock && !answered" class="hrow">
        <button class="btn ghost" @click="start(0)">離開解鎖測驗</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ALL_KANA, ROADMAP, STEPS, stepLabel } from '@/data';
import type { KanaItem } from '@/data/types';
import { MODES, PASS, fitPx, makeQs, type Question, type QuizMode } from '@/lib/kana';
import { say } from '@/composables/useAudio';
import { useProgressStore } from '@/stores/progress';
import ScopeChips from '@/components/ScopeChips.vue';
import SpeakerIcon from '@/components/SpeakerIcon.vue';

defineOptions({ name: 'QuizPage' });

const p = useProgressStore();
const route = useRoute();
const router = useRouter();

const qs = ref<Question[]>([]);
const i = ref(0);
const score = ref(0);
const wrong = ref<KanaItem[]>([]);
const answered = ref<string | null>(null);
/** 0 = 一般複習測驗；其他數字 = 第幾步的解鎖測驗 */
const unlock = ref(0);
let active = false;

const q = computed(() => qs.value[i.value]);
/** 選項有長句子時排成一欄 */
const singleCol = computed(() => {
  const cur = q.value;
  return !!cur && cur.opts.some((o) => (cur.m === 'k2r' ? o.r : o.k).length > 7);
});
const done = computed(() => qs.value.length > 0 && i.value >= qs.value.length);
const ok = computed(() => score.value >= PASS);
const unlockStep = computed(() => STEPS.find((x) => x.id === unlock.value));
const nextHas = computed(() => STEPS.some((x) => x.id === unlock.value + 1));
const wrongList = computed(() => [...new Map(wrong.value.map((k) => [k.k, k])).values()]);
const ask = computed(() =>
  q.value?.m === 'k2r' ? '這個字怎麼唸？' : q.value?.m === 'r2k' ? '哪一個字是這個音？' : '聽發音，選出正確的字',
);

const resultMsg = computed(() => {
  const id = unlock.value;
  if (!id) {
    const s = score.value;
    return s === qs.value.length ? '全對，很穩！' : s >= 8 ? '很不錯，把錯的字再看一下。' : '再複習一下字卡，然後重新測一次。';
  }
  if (!ok.value) return `答對 ${score.value} 題，還差 ${PASS - score.value} 題。把答錯的字再練一下，隨時可以重考。`;
  const nextR = ROADMAP.find((r) => r.n === id + 1);
  if (nextHas.value) return `通過了！第 ${id + 1} 步 ${stepLabel(id + 1)} 已經解鎖。`;
  if (nextR?.ext) return `恭喜！目前的內容全部學完了。下一站是${nextR.t}，內容準備好就會加進來。`;
  if (nextR) return `通過了！第 ${id} 步完成。第 ${id + 1} 步的內容還沒加進網站，準備好再繼續。`;
  return '通過了！全部步驟都完成了。';
});

function start(unlockId: number) {
  const u = unlockId;
  const P = u ? ALL_KANA.filter((k) => k.step === u) : p.pool;
  // 只有 3 個字的行，從前一行補干擾選項
  const D = u ? ALL_KANA.filter((k) => k.step <= u && k.step >= u - 1) : P;
  const ids = MODES.map((m) => m.id);
  const modeFn = u ? () => ids[Math.floor(Math.random() * ids.length)]! : () => p.d.qmode;
  qs.value = P.length ? makeQs(P, modeFn, D) : [];
  i.value = 0;
  score.value = 0;
  wrong.value = [];
  answered.value = null;
  unlock.value = u;
  autoSpeak();
}

function autoSpeak() {
  if (active && q.value?.m === 'a2k') say(q.value.a, q.value.a.k);
}

function pickMode(m: QuizMode) {
  p.setQmode(m);
  start(0);
}

function answer(k: string) {
  if (answered.value || !q.value) return;
  answered.value = k;
  if (k === q.value.a.k) score.value++;
  else wrong.value.push(q.value.a);
  if (q.value.m !== 'a2k') say(q.value.a, q.value.a.k);
}

function next() {
  i.value++;
  answered.value = null;
  if (done.value && unlock.value && ok.value) p.pass(unlock.value);
  autoSpeak();
}

function goLearn(id: number) {
  p.setStep(id);
  start(0);
  void router.push('/learn');
  window.scrollTo(0, 0);
}

/** 從學習頁按「開始解鎖測驗」會帶 ?unlock=步驟 */
watch(
  () => route.query.unlock,
  (v) => {
    if (v === undefined) return;
    const id = Number(v);
    void router.replace({ path: '/quiz' });
    if (STEPS.some((s) => s.id === id) && id <= p.curU) start(id);
  },
  { immediate: true },
);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && answered.value && !done.value) {
    e.preventDefault();
    next();
  }
}

if (!qs.value.length) start(0);

onActivated(() => {
  active = true;
  window.addEventListener('keydown', onKey);
  if (!qs.value.length) start(0);
});
onDeactivated(() => {
  active = false;
  window.removeEventListener('keydown', onKey);
});
</script>
