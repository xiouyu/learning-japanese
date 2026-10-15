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
          下一站・<span class="kn">課本第 1 課</span>{{ p.curU > p.d.passed ? '・學完全部假名後' : '' }}
        </span>
        <span v-else class="chip locked">
          第 {{ next.n }} 步 <span class="kn">{{ stepLabel(next.n) }}</span>・{{ lockMsg }}
        </span>
      </template>
    </div>

    <div class="stephead">
      <div class="eyebrow">第 {{ step.id }} 步・{{ step.row }}{{ step.id <= p.d.passed ? '・已通過' : '・學習中' }}</div>
      <h2>{{ step.title }}</h2>
      <p class="lead muted">{{ step.rule }}點一下字卡可以聽發音，並在下方描字練習。</p>
    </div>

    <div class="kgrid">
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

    <div class="sec">
      <h3>描字練習</h3>
      <div class="studio">
        <div class="padwrap">
          <WritingPad ref="pad" :char="kana.k" :guide="guide" />
          <div class="hrow">
            <button class="btn" @click="pad?.clear()">清除</button>
            <button class="btn" @click="guide = !guide">{{ guide ? '隱藏範本' : '顯示範本' }}</button>
            <button class="btn icon-btn" aria-label="播放發音" @click="speak(kana.k)"><SpeakerIcon /></button>
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
      <h3>唸唸看：用學過的字組成的單字</h3>
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
        這一步的內容都唸熟、寫熟之後，再來考解鎖測驗。共 {{ QN }} 題，看字選拼音、聽音選字、看拼音選字三種題型混在一起，答對
        {{ PASS }} 題以上就解鎖下一步。沒通過可以一直重考。
      </p>
      <div class="hrow">
        <button class="btn primary" @click="startUnlock">開始解鎖測驗</button>
      </div>
    </div>

    <div class="sec">
      <h3>學習路線</h3>
      <ol class="road">
        <template v-for="(r, i) in ROADMAP" :key="r.n">
          <li v-if="i === 0 || ROADMAP[i - 1]!.part !== r.part" class="rgrp">{{ r.part }}</li>
          <li>
            <span class="n">{{ r.ext ? '終點' : `第 ${r.n} 步` }}</span>
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
import type { RoadmapItem } from '@/data/types';
import { PASS, QN, sqFontSize } from '@/lib/kana';
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
  speak(step.value.kana[i]!.k);
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
    return { cls: done ? 'cur' : '', label: done ? '下一站' : '最後' };
  }
  if (r.n <= p.d.passed) return { cls: 'done', label: '已通過' };
  if (r.n === p.curU && p.curU > p.d.passed) return { cls: 'cur', label: '學習中' };
  return { cls: '', label: '未解鎖' };
}
</script>
