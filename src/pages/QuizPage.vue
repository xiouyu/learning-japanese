<template>
  <section class="panel">
    <div v-if="exam" class="stephead">
      <div class="eyebrow">{{ exam.title }}・{{ exam.n }} 題答對 {{ exam.pass }} 題以上通過</div>
      <h2 style="font-size: 28px; letter-spacing: 0.08em">{{ exam.title }}</h2>
      <p class="lead muted">{{ exam.scope }}。通過{{ exam.reward }}。</p>
    </div>
    <div v-else-if="unlock" class="stephead">
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
      <div class="hrow" aria-label="題數">
        <span class="muted" style="font-size: 14px">題數</span>
        <button v-for="n in QN_OPTS" :key="n" class="chip" :aria-pressed="n === p.d.qn" @click="pickQn(n)">
          {{ n === ENDLESS ? '不限，想停再停' : n ? `${n} 題` : `全部各一次（${poolSize} 題）` }}
        </button>
      </div>
      <div class="hrow" aria-label="出題方式">
        <span class="muted" style="font-size: 14px">出題</span>
        <button class="chip" :aria-pressed="p.d.qpick === 'even'" @click="pickPick('even')">平均出題</button>
        <button class="chip" :aria-pressed="p.d.qpick === 'weak'" @click="pickPick('weak')">常錯的優先</button>
      </div>
      <p v-if="p.d.qpick === 'weak' && !retry" class="muted lead">
        <template v-if="weakTop.length">
          常錯的會比較常出現：<span v-for="k in weakTop" :key="k.k" class="kn weak-k">{{ k.k }}</span>
          <template v-if="p.d.qn === 0">（「全部各一次」時每個字都考一次，常錯的排在前面）</template>
        </template>
        <template v-else>這個範圍還沒有答錯的紀錄，先平均出題；考過幾次後就會針對常錯的字出題。</template>
      </p>
      <p v-if="retry" class="muted lead">正在練習剛才答錯的 {{ qs.length }} 個，每個用答錯時的題型再考一次。</p>
    </template>

    <!-- 結果 -->
    <div v-if="done" class="result qbox" :class="{ pass: (unlock || exam) && ok }">
      <div class="score">{{ score }} / {{ total }}</div>
      <p>{{ resultMsg }}</p>
      <div v-if="exam" class="sec">
        <h3>{{ exam.id === 'kana' ? '各單元的成績' : '各課的成績' }}</h3>
        <ul class="exam-parts">
          <li v-for="g in partScores" :key="g.part" :class="{ weak: g.right < g.total }">
            <span>{{ g.part }}</span><b>{{ g.right }} / {{ g.total }}</b>
          </li>
        </ul>
      </div>
      <div v-if="wrongList.length" class="sec">
        <h3>{{ wrongPhrase ? '答錯的句子' : '答錯的字' }}</h3>
        <div class="hrow">
          <button v-for="k in wrongList" :key="k.k" class="chip" @click="say(k, k.k)">
            <span class="kn">{{ k.k }}</span> {{ wrongPhrase ? gist(k.z) : k.r }}
          </button>
        </div>
      </div>
      <div class="hrow">
        <template v-if="exam">
          <button v-if="ok && examNext" class="btn primary" @click="goLearn(exam.after + 1)">去學第 {{ exam.after + 1 }} 步 {{ stepLabel(exam.after + 1) }} →</button>
          <button v-else-if="!ok" class="btn primary" @click="startExam(exam.id)">重考{{ exam.title }}</button>
          <button v-if="!ok" class="btn" @click="practiceWrong">先練答錯的 {{ wrongList.length }} 個</button>
          <button class="btn" @click="start(0)">回到一般測驗</button>
        </template>
        <template v-else-if="!unlock">
          <button v-if="wrongList.length" class="btn primary" @click="practiceWrong">只練答錯的 {{ wrongList.length }} 個</button>
          <!-- 從解鎖測驗、大會考過來練答錯的：練完直接回去重考 -->
          <button v-if="back?.unlock" class="btn" :class="{ primary: !wrongList.length }" @click="start(back.unlock)">重考第 {{ back.unlock }} 步解鎖測驗</button>
          <button v-else-if="backExam" class="btn" :class="{ primary: !wrongList.length }" @click="startExam(backExam.id)">重考{{ backExam.title }}</button>
          <button class="btn" :class="{ primary: !wrongList.length && !back }" @click="start(0)">{{ back ? '回到一般測驗' : '再測一次' }}</button>
        </template>
        <template v-else-if="ok && dueExam">
          <button class="btn primary" @click="startExam(dueExam.id)">開始{{ dueExam.title }} →</button>
          <button class="btn" @click="start(0)">回到一般測驗</button>
        </template>
        <template v-else-if="ok">
          <button v-if="nextHas" class="btn primary" @click="goLearn(unlock + 1)">去學第 {{ unlock + 1 }} 步 →</button>
          <button class="btn" @click="start(0)">回到一般測驗</button>
        </template>
        <template v-else>
          <button class="btn primary" @click="start(unlock)">重考</button>
          <button class="btn" @click="practiceWrong">先練答錯的 {{ wrongList.length }} 個</button>
          <button class="btn" @click="goLearn(unlock)">回去複習這一步</button>
        </template>
      </div>
    </div>

    <!-- 題目 -->
    <div v-else-if="q" class="qbox">
      <div class="qhead">
        <div class="counter">
          第 {{ i + 1 }}{{ endlessRun ? '' : ` / ${qs.length}` }} 題・答對 {{ score }}{{ unlock || exam ? '・' + ask : '' }}
        </div>
        <!-- 放在右上角，跟下方的「下一題」離遠一點，避免連按時誤觸 -->
        <button v-if="unlock || exam" class="btn ghost quit-btn" @click="quit">離開測驗</button>
        <button v-else-if="endlessRun" class="btn ghost quit-btn" @click="ended = true">結束練習</button>
      </div>
      <div class="qprompt">
        <template v-if="q.m === 'k2r' || q.m === 'k2z' || q.m === 't2r'">
          <!-- 句子太長就換行顯示，不要縮到看不清楚 -->
          <span v-if="glyphs(q.a.k) > 8" class="kana sent">{{ q.a.k }}</span>
          <span v-else class="kana" :style="{ fontSize: fitPx(q.a.k, 96, 440) }">{{ q.a.k }}</span>
        </template>
        <span v-else-if="q.m === 'r2k'" class="mono">{{ q.a.r }}</span>
        <button v-else class="btn primary" style="font-size: 16px; padding: 14px 22px" @click="say(q.a, q.a.k)">
          <SpeakerIcon /> {{ answered ? '再聽一次' : '播放發音' }}
        </button>
      </div>
      <!-- 打字作答：拼音、假名、課本的漢字寫法都算對 -->
      <form v-if="isTyped(q.m)" class="typed" @submit.prevent="submitTyped">
        <input
          ref="typedEl"
          v-model="typed"
          class="typed-in"
          :class="answered && (answered === q.a.k ? 'right' : 'wrong')"
          :disabled="!!answered"
          :aria-label="ask"
          :placeholder="q.m === 't2r' ? '打拼音，例如 sakana' : '打拼音或假名'"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="done"
          @keydown.enter.stop
        />
        <button class="btn primary" :disabled="!!answered || !typed.trim()">確定</button>
      </form>
      <p v-if="isTyped(q.m) && !answered" class="muted typed-tip">
        拼音用平文式（shi、chi、tsu、fu），長音打兩個母音（oo、ee，或 ou、ei 都可以），空白和標點不用打。也可以直接打假名。
      </p>
      <div v-if="!isTyped(q.m)" class="opts" :class="{ single: singleCol }">
        <button
          v-for="o in q.opts"
          :key="o.k"
          class="opt"
          :class="[optClass, answered && (o.k === q.a.k ? 'right' : o.k === answered ? 'wrong' : ''), { long: optText(o).length > 7 }]"
          :disabled="!!answered"
          @click="answer(o.k)"
        >
          {{ optText(o) }}
        </button>
      </div>
      <div class="fb" :class="answered ? (answered === q.a.k ? 'good' : 'bad') : ''">
        <template v-if="answered">
          {{ answered === q.a.k ? '答對了' : '答錯了' }}：<span class="kana" style="font-size: 20px">{{ q.a.k }}</span> ＝
          <span class="mono">{{ q.a.r }}</span>，{{ q.a.z }}
          <span v-if="isTyped(q.m) && answered !== q.a.k" class="typed-you">你打的是「{{ typedAnswer }}」</span>
        </template>
      </div>
      <div v-if="answered" class="hrow">
        <button class="btn primary" @click="next">{{ i === qs.length - 1 ? '看結果' : '下一題' }} →</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { ALL_KANA, EXAMS, ROADMAP, STEPS, stepLabel, type Exam } from '@/data';
import type { KanaItem } from '@/data/types';
import {
  CHOICE_MODES,
  ENDLESS,
  MODES,
  PASS,
  QN_OPTS,
  checkTyped,
  fitPx,
  gist,
  glyphs,
  isListen,
  isMeaning,
  isTyped,
  makeExam,
  makeQs,
  weakWeight,
  type Question,
  type QuizMode,
  type QuizPick,
} from '@/lib/kana';
import { say } from '@/composables/useAudio';
import { useProgressStore } from '@/stores/progress';
import ScopeChips from '@/components/ScopeChips.vue';
import SpeakerIcon from '@/components/SpeakerIcon.vue';

defineOptions({ name: 'QuizPage' });

const p = useProgressStore();
const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const qs = ref<Question[]>([]);
const i = ref(0);
const score = ref(0);
const wrong = ref<KanaItem[]>([]);
/** 答錯時的題型，練習答錯的時候用同一種題型再考 */
const wrongMode = new Map<string, QuizMode>();
/** 打字作答：輸入框的內容、送出時打的字 */
const typed = ref('');
const typedAnswer = ref('');
const typedEl = ref<HTMLInputElement | null>(null);

/** 正在練習剛才答錯的 */
const retry = ref(false);
/** 不限題數：快做完時自動補題，按「結束練習」才看結果 */
const endlessRun = ref(false);
const ended = ref(false);
/** 練答錯的之前是在考哪個解鎖測驗或大會考 */
const back = ref<{ unlock?: number; exam?: string } | null>(null);
const backExam = computed(() => EXAMS.find((e) => e.id === back.value?.exam) ?? null);
const answered = ref<string | null>(null);
/** 0 = 一般複習測驗；其他數字 = 第幾步的解鎖測驗 */
const unlock = ref(0);
/** 正在考的大會考 */
const exam = ref<Exam | null>(null);
let active = false;

const q = computed(() => qs.value[i.value]);
/** 換題時清空輸入框；打字題自動把游標放進輸入框 */
watch(q, (cur) => {
  typed.value = '';
  if (cur && isTyped(cur.m)) void nextTick(() => typedEl.value?.focus());
});
/** 選項顯示的文字：拼音、中文意思或假名 */
const optText = (o: KanaItem) => (q.value?.m === 'k2r' ? o.r : q.value && isMeaning(q.value.m) ? gist(o.z) : o.k);
const optClass = computed(() => (q.value?.m === 'k2r' ? 'r' : q.value && isMeaning(q.value.m) ? 'z' : 'k'));
/** 選項有長句子時排成一欄 */
const singleCol = computed(() => !!q.value && q.value.opts.some((o) => optText(o).length > 7));
const done = computed(() => qs.value.length > 0 && (ended.value || i.value >= qs.value.length));
/** 結果的總題數：不限題數時是實際作答的題數 */
const total = computed(() => (endlessRun.value ? i.value + (answered.value ? 1 : 0) : qs.value.length));
const ok = computed(() => score.value >= (exam.value ? exam.value.pass : PASS));
/** 剛通過的這一步後面接著大會考 */
const dueExam = computed(() => EXAMS.find((e) => e.after === unlock.value && !p.examPassed(e.id)) ?? null);
const examNext = computed(() => !!exam.value && STEPS.some((x) => x.id === exam.value!.after + 1));
/** 答錯的是課本的句子（不是假名） */
const wrongPhrase = computed(() => wrong.value.some((k) => STEPS[k.step - 1]?.kind === 'phrase'));
const unlockStep = computed(() => STEPS.find((x) => x.id === unlock.value));
const nextHas = computed(() => STEPS.some((x) => x.id === unlock.value + 1));
const wrongList = computed(() => [...new Map(wrong.value.map((k) => [k.k, k])).values()]);
const ASK: Record<QuizMode, string> = {
  k2r: '這個字怎麼唸？',
  r2k: '哪一個字是這個音？',
  a2k: '聽發音，選出正確的字',
  k2z: '這句話是什麼意思？',
  a2z: '聽錄音，選出意思',
  t2r: '打出這個字的唸法',
  a2t: '聽發音，打出來',
};
const ask = computed(() => (q.value ? ASK[q.value.m] : ''));
/** 練習範圍裡有幾個不同的字（句子） */
const poolSize = computed(() => new Set(p.pool.map((k) => k.k)).size);
/** 範圍裡最常錯的字 */
const weakTop = computed(() =>
  [...new Map(p.pool.filter((k) => p.d.weak[k.k]).map((k) => [k.k, k])).values()]
    .sort((a, b) => p.d.weak[b.k]! - p.d.weak[a.k]!)
    .slice(0, 10),
);

/** 大會考各單元答對幾題，方便知道要回去複習哪裡 */
const partScores = computed(() =>
  (exam.value?.groups ?? []).map((g) => {
    const steps = new Set(g.kana.map((k) => k.step));
    const total = qs.value.filter((x) => steps.has(x.a.step)).length;
    const miss = wrong.value.filter((k) => steps.has(k.step)).length;
    return { part: g.part, total, right: total - miss };
  }).filter((g) => g.total),
);

const resultMsg = computed(() => {
  const e = exam.value;
  if (e) {
    if (ok.value) return e.passMsg;
    const where = e.id === 'kana' ? '哪個單元' : '哪幾課';
    return `答對 ${score.value} 題，還差 ${e.pass - score.value} 題。看一下${where}錯比較多，回去複習，隨時可以重考。`;
  }
  const id = unlock.value;
  if (!id) {
    const s = score.value;
    const n = total.value;
    if (!n) return '這次還沒有作答。';
    if (retry.value) return s === n ? '剛才答錯的都會了！' : '還有幾個不熟，再練一次看看。';
    const head = endlessRun.value ? `這次練了 ${n} 題，答對率 ${Math.round((s / n) * 100)}%。` : '';
    return head + (s === n ? '全對，很穩！' : s >= n * 0.8 ? '很不錯，把錯的再看一下。' : '再複習一下字卡，然後重新測一次。');
  }
  if (!ok.value) return `答對 ${score.value} 題，還差 ${PASS - score.value} 題。把答錯的字再練一下，隨時可以重考。`;
  const nextR = ROADMAP.find((r) => r.n === id + 1);
  const de = dueExam.value;
  if (de) return `通過了！${de.done}。最後還有${de.title}（${de.n} 題答對 ${de.pass} 題），通過${de.reward}。`;
  if (nextHas.value) return `通過了！第 ${id + 1} 步 ${stepLabel(id + 1)} 已經解鎖。`;
  if (nextR?.ext) return `恭喜！目前的內容全部學完了。下一站是${nextR.t}，內容準備好就會加進來。`;
  if (nextR) return `通過了！第 ${id} 步完成。第 ${id + 1} 步的內容還沒加進網站，準備好再繼續。`;
  return '通過了！全部步驟都完成了。';
});

/** 離開解鎖測驗：已經開始作答就先確認，避免誤觸 */
function quit() {
  if (i.value === 0 && !answered.value) return start(0);
  $q.dialog({
    title: exam.value ? '離開大會考？' : '離開解鎖測驗？',
    message: '這次的作答不會保留，下次要從第 1 題重新開始。',
    ok: { label: '離開', flat: true, noCaps: true, color: 'negative' },
    cancel: { label: '繼續作答', unelevated: true, noCaps: true, color: 'primary' },
    focus: 'cancel',
  }).onOk(() => start(0));
}

function start(unlockId: number) {
  const u = unlockId;
  const P = u ? ALL_KANA.filter((k) => k.step === u) : p.pool;
  // 只有 3 個字的行，從前一行補干擾選項
  const D = u ? ALL_KANA.filter((k) => k.step <= u && k.step >= u - 1) : P;
  const ids = CHOICE_MODES;
  const modeFn = u ? () => ids[Math.floor(Math.random() * ids.length)]! : () => p.d.qmode;
  if (u) qs.value = P.length ? makeQs(P, modeFn, D) : [];
  else qs.value = P.length ? practiceBatch(p.d.qn === ENDLESS ? 20 : p.d.qn) : [];
  reset();
  unlock.value = u;
  endlessRun.value = !u && p.d.qn === ENDLESS;
  autoSpeak();
}

/**
 * 一般測驗出題：n 題（0 = 範圍裡每個字各考一次）。
 * 「常錯的優先」時依弱點分數抽題；「全部各一次」時每個字都考，但常錯的排前面。
 */
function practiceBatch(n: number): Question[] {
  const P = p.pool;
  const modeFn = () => p.d.qmode;
  const weakOn = p.d.qpick === 'weak' && P.some((k) => p.d.weak[k.k]);
  if (n === 0) {
    const uniq = [...new Map(P.map((k) => [k.k, k])).values()];
    const qs = makeQs(uniq, modeFn, P, uniq.length);
    if (weakOn) qs.sort((a, b) => (p.d.weak[b.a.k] ?? 0) - (p.d.weak[a.a.k] ?? 0));
    return qs;
  }
  return makeQs(P, modeFn, P, n, weakOn ? (a) => weakWeight(p.d.weak[a.k] ?? 0) : undefined);
}

function reset() {
  i.value = 0;
  score.value = 0;
  wrong.value = [];
  wrongMode.clear();
  answered.value = null;
  unlock.value = 0;
  exam.value = null;
  retry.value = false;
  back.value = null;
  endlessRun.value = false;
  ended.value = false;
}

/** 只練剛才答錯的：每個用答錯時的題型考一次，干擾選項從同一步和練習範圍裡挑 */
function practiceWrong() {
  const P = wrongList.value;
  if (!P.length) return;
  const modes = new Map(wrongMode);
  const from = unlock.value ? { unlock: unlock.value } : exam.value ? { exam: exam.value.id } : retry.value ? back.value : null;
  const steps = new Set(P.map((k) => k.step));
  const D = ALL_KANA.filter((k) => steps.has(k.step)).concat(p.pool);
  qs.value = makeQs(P, (a) => modes.get(a.k) ?? p.d.qmode, D, P.length);
  reset();
  retry.value = true;
  back.value = from;
  autoSpeak();
  window.scrollTo(0, 0);
}

/** 大會考：每個單元（每一課）平均出題，題型混在一起 */
function startExam(id: string) {
  const e = EXAMS.find((x) => x.id === id);
  if (!e) return;
  qs.value = makeExam(
    e.groups.map((g) => g.kana),
    e.mode,
    e.n,
  );
  reset();
  exam.value = e;
  autoSpeak();
  window.scrollTo(0, 0);
}

function autoSpeak() {
  if (active && q.value && isListen(q.value.m)) say(q.value.a, q.value.a.k);
}

function pickMode(m: QuizMode) {
  p.setQmode(m);
  start(0);
}

function pickQn(n: number) {
  p.setQn(n);
  start(0);
}

function pickPick(m: QuizPick) {
  p.setQpick(m);
  start(0);
}

function answer(k: string) {
  if (answered.value || !q.value) return;
  answered.value = k;
  p.recordAnswer(q.value.a.k, k === q.value.a.k);
  if (k === q.value.a.k) score.value++;
  else {
    wrong.value.push(q.value.a);
    wrongMode.set(q.value.a.k, q.value.m);
  }
  if (!isListen(q.value.m)) say(q.value.a, q.value.a.k);
}

/** 打字作答送出：對的話當成選了正確答案，錯的話記下打了什麼 */
function submitTyped() {
  if (answered.value || !q.value || !typed.value.trim()) return;
  typedAnswer.value = typed.value.trim();
  answer(checkTyped(q.value.a, typed.value) ? q.value.a.k : '\u0000');
}

function next() {
  i.value++;
  answered.value = null;
  // 不限題數：做到最後一題前再補一批（依最新的弱點分數出題）
  if (endlessRun.value && i.value >= qs.value.length - 1) {
    const more = practiceBatch(20);
    const last = qs.value[qs.value.length - 1];
    if (last && more.length > 1 && more[0]!.a.k === last.a.k) more.push(more.shift()!);
    qs.value = qs.value.concat(more);
  }
  if (done.value && unlock.value && ok.value) p.pass(unlock.value);
  if (done.value && exam.value && ok.value) p.passExam(exam.value.id);
  autoSpeak();
}

function goLearn(id: number) {
  p.setStep(id);
  start(0);
  void router.push('/learn');
  window.scrollTo(0, 0);
}

/** 從學習頁按「開始大會考」會帶 ?exam=大會考 id（舊版是 ?exam=1）；前面的步驟都通過了才能考 */
watch(
  () => route.query.exam,
  (v) => {
    if (v === undefined) return;
    void router.replace({ path: '/quiz' });
    const e = EXAMS.find((x) => x.id === (v === '1' ? 'kana' : v));
    if (e && p.d.passed >= e.after) startExam(e.id);
  },
  { immediate: true },
);

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
