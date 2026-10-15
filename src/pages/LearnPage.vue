<template>
  <section class="panel">
    <div v-if="parts.length > 1" class="hrow parts" aria-label="選擇單元">
      <button v-for="pt in parts" :key="pt" class="seg" :aria-pressed="pt === step.part" @click="pickPart(pt)">
        {{ pt }}
      </button>
    </div>

    <div class="hrow" aria-label="選擇步驟">
      <button
        v-for="x in partSteps"
        :key="x.id"
        class="chip"
        :aria-pressed="x.id === step.id"
        @click="p.setStep(x.id)"
      >
        第 {{ x.id }} 步 <span class="kn">{{ x.row }}</span>{{ x.id <= p.d.passed ? ' ✓' : '' }}
      </button>
      <template v-if="next && (next.part === step.part || step.id === p.curU)">
        <span v-if="next.ext" class="chip locked">
          下一站・<span class="kn">{{ next.row }}</span>・準備中
        </span>
        <span v-else class="chip locked">
          第 {{ next.n }} 步 <span class="kn">{{ stepLabel(next.n) }}</span>・{{ lockMsg }}
        </span>
      </template>
    </div>

    <div class="stephead">
      <div class="eyebrow">第 {{ step.id }} 步・{{ step.row }}{{ step.id <= p.d.passed ? '・已通過' : '・學習中' }}</div>
      <h2>{{ step.title }}</h2>
      <p class="lead muted">{{ step.rule }}{{ isPhrase ? '點一下句子可以聽發音，並在下方跟著唸。' : '點一下字卡可以聽發音，並在下方描字練習。' }}</p>
    </div>

    <!-- 課本的句子 -->
    <div v-if="isPhrase" class="plist">
      <button
        v-for="(x, i) in step.kana"
        :key="x.k"
        class="pcard"
        :aria-pressed="i === p.curKana"
        @click="pickKana(i)"
      >
        <span v-if="x.ex" class="badge">注意</span>
        <span class="pk kana">{{ x.k }}</span>
        <span class="rom">{{ x.r }}</span>
        <span class="pz">{{ x.z }}</span>
        <span v-if="x.o" class="org">{{ x.ol || '寫成' }} <b class="kana">{{ x.o }}</b></span>
        <span v-if="x.audio" class="ptag">真人錄音</span>
      </button>
    </div>

    <div v-else class="kgrid">
      <button
        v-for="(x, i) in step.kana"
        :key="x.k"
        class="kcard"
        :aria-pressed="i === p.curKana"
        @click="pickKana(i)"
      >
        <span v-if="x.ex" class="badge">例外</span>
        <div class="sq" :style="{ fontSize: sqFontSize(x.k) }">{{ x.k }}</div>
        <div class="rom">{{ x.r }}</div>
        <div class="zy">{{ x.z }}</div>
        <div v-if="x.o" class="org">{{ x.ol || '來源' }} <b>{{ x.o }}</b></div>
      </button>
    </div>

    <!-- 課本的會話 -->
    <div v-if="step.dialogs?.length" class="sec">
      <h3>聽會話</h3>
      <p class="muted lead">先聽錄音，想想看他們在什麼場合說這些話，再看下面的句子確認。</p>
      <div class="dlist">
        <div v-for="d in step.dialogs" :key="d.label" class="dcard">
          <div class="dhead">
            <span class="dlabel">{{ d.label }}</span>
            <button class="btn icon-btn" :aria-label="`播放 ${d.label}`" @click="playDialog(d)"><SpeakerIcon /></button>
          </div>
          <div v-for="(l, li) in d.lines" :key="li" class="dline">
            <span v-if="l.who" class="who">{{ l.who }}</span>
            <span>
              <span class="kana dt">{{ l.t }}</span>
              <span v-if="l.r" class="kana dr">（{{ l.r }}）</span>
              <span v-if="l.m" class="muted dm">{{ l.m }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 句子的步驟：跟讀練習 -->
    <div v-if="isPhrase" class="sec">
      <h3>跟讀練習</h3>
      <div class="shadow">
        <div class="kana sbig">{{ kana.k }}</div>
        <div class="rom">{{ kana.r }}</div>
        <p>{{ kana.z }}</p>
        <div class="hrow">
          <button class="btn primary" @click="sayKana"><SpeakerIcon /> 播放</button>
          <button class="btn" @click="stepKana(-1)">← 上一句</button>
          <button class="btn" @click="stepKana(1)">下一句 →</button>
        </div>
        <p class="muted">先聽 3 次，再跟著錄音一起唸 3 次（シャドーイング），最後不看字自己說說看。</p>
      </div>
    </div>

    <div v-else class="sec">
      <h3>描字練習</h3>
      <div class="studio">
        <div class="padwrap">
          <WritingPad ref="pad" :char="kana.k" :guide="guide" />
          <div class="hrow">
            <button class="btn" @click="pad?.clear()">清除</button>
            <button class="btn" @click="guide = !guide">{{ guide ? '隱藏範本' : '顯示範本' }}</button>
            <button class="btn icon-btn" aria-label="播放發音" @click="sayKana"><SpeakerIcon /></button>
          </div>
        </div>
        <div class="info">
          <div class="big"><span class="kana">{{ kana.k }}</span><span class="rom">{{ kana.r }}</span></div>
          <p>{{ kana.z }}</p>
          <p class="muted">{{ srcLine }}先照淡色範本描 3 次，再按「隱藏範本」自己寫 2 次。</p>
          <div class="hrow">
            <button class="btn" @click="stepKana(-1)">← 上一個</button>
            <button class="btn" @click="stepKana(1)">下一個 →</button>
          </div>
        </div>
      </div>
    </div>

    <div class="sec">
      <h3>重點</h3>
      <ul class="notes">
        <li v-for="n in step.notes" :key="n">{{ n }}</li>
      </ul>
    </div>

    <div class="sec">
      <h3>{{ isPhrase ? '課本裡的其他詞語和句子' : '唸唸看：用學過的字組成的單字' }}</h3>
      <p class="muted lead">先自己唸，再按「看答案」或播放發音確認。</p>
      <WordList v-if="step.words.length" :words="step.words" />
      <p v-else class="muted">這一步能組成的單字太少，先把字唸熟、寫熟，下一步開始就有單字可以唸。</p>
    </div>

    <div v-if="step.id <= p.d.passed" class="unlock passed">
      <h3>解鎖測驗・已通過</h3>
      <p class="muted">這一步已經通過了。想再複習，可以到「字卡」或「測驗」分頁。</p>
    </div>
    <div v-else class="unlock">
      <h3>解鎖測驗：第 {{ step.id }} 步 {{ step.row }}</h3>
      <p>
        這一步的內容都{{ isPhrase ? '聽熟、唸熟' : '唸熟、寫熟' }}之後，再來考解鎖測驗。共 {{ QN }} 題，看字選拼音、聽音選字、看拼音選字三種題型混在一起，答對
        {{ PASS }} 題以上就解鎖下一步。沒通過可以一直重考。
      </p>
      <div class="hrow">
        <button class="btn primary" @click="startUnlock">開始解鎖測驗</button>
      </div>
    </div>

    <p v-if="step.source" class="muted credit">出處：{{ step.source }}・《いろどり 生活の日本語》入門（A1）©The Japan Foundation</p>

    <div class="sec">
      <h3>學習路線</h3>
      <ol class="road">
        <template v-for="(r, i) in ROADMAP" :key="r.n">
          <li v-if="i === 0 || ROADMAP[i - 1]!.part !== r.part" class="rgrp">{{ r.part }}</li>
          <li>
            <span class="n">{{ r.ext ? '下一站' : `第 ${r.n} 步` }}</span>
            <span>
              <span class="t">{{ r.t }}</span>
              <span v-if="r.note" class="muted" style="font-size: 13px"> ・{{ r.note }}</span>
            </span>
            <span class="pill" :class="roadState(r).cls">{{ roadState(r).label }}</span>
          </li>
        </template>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ROADMAP, STEPS, stepLabel } from '@/data';
import type { Dialog, RoadmapItem } from '@/data/types';
import { PASS, QN, sqFontSize } from '@/lib/kana';
import { playAudio, say } from '@/composables/useAudio';
import { speak } from '@/composables/useSpeech';
import { useProgressStore } from '@/stores/progress';
import WritingPad from '@/components/WritingPad.vue';
import WordList from '@/components/WordList.vue';
import SpeakerIcon from '@/components/SpeakerIcon.vue';

defineOptions({ name: 'LearnPage' });

const p = useProgressStore();
const router = useRouter();
const pad = ref<InstanceType<typeof WritingPad> | null>(null);
const guide = ref(true);

const step = computed(() => STEPS.find((x) => x.id === p.d.step) ?? STEPS[0]!);
const kana = computed(() => step.value.kana[p.curKana] ?? step.value.kana[0]!);
const isPhrase = computed(() => step.value.kind === 'phrase');
const next = computed(() => ROADMAP.find((r) => r.n === p.curU + 1));
const lockMsg = computed(() => (p.curU > p.d.passed ? `通過第 ${p.curU} 步測驗後解鎖` : '內容準備中'));
const parts = computed(() => [...new Set(STEPS.filter((x) => x.id <= p.curU).map((x) => x.part))]);
const partSteps = computed(() => STEPS.filter((x) => x.id <= p.curU && x.part === step.value.part));
const srcLine = computed(() => {
  const k = kana.value;
  if (!k.o || k.ol) return '';
  return step.value.kind === 'kata' ? `取自漢字「${k.o}」的一部分。` : `來源漢字「${k.o}」的草書。`;
});

function pickPart(pt: string) {
  const last = STEPS.filter((x) => x.part === pt && x.id <= p.curU).pop();
  if (last) p.setStep(last.id);
}

function pickKana(i: number) {
  p.curKana = i;
  const k = step.value.kana[i]!;
  say(k, k.k);
}

const sayKana = () => say(kana.value, kana.value.k);

/** 會話：有錄音播錄音，沒有就用語音合成一句一句唸 */
function playDialog(d: Dialog) {
  if (d.audio) playAudio(d.audio);
  else speak(d.lines.map((l) => l.t).join('　'));
}

function stepKana(delta: number) {
  const n = step.value.kana.length;
  pickKana((p.curKana + n + delta) % n);
}

function startUnlock() {
  void router.push({ path: '/quiz', query: { unlock: String(step.value.id) } });
  window.scrollTo(0, 0);
}

function roadState(r: RoadmapItem): { cls: string; label: string } {
  if (r.ext) {
    const done = p.d.passed >= STEPS.length;
    return { cls: done ? 'cur' : '', label: '準備中' };
  }
  if (r.n <= p.d.passed) return { cls: 'done', label: '已通過' };
  if (r.n === p.curU && p.curU > p.d.passed) return { cls: 'cur', label: '學習中' };
  return { cls: '', label: '未解鎖' };
}
</script>
