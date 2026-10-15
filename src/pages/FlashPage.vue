<template>
  <section class="panel">
    <ScopeChips @change="start" />

    <div v-if="!cur" class="result">
      <p class="muted">這一輪完成了</p>
      <p>記住 <b>{{ known }}</b> 個，「不熟」重複練習 <b>{{ againN }}</b> 次。</p>
      <div class="hrow"><button class="btn primary" @click="start">再來一輪</button></div>
    </div>

    <div v-else class="fcbox">
      <div class="counter">剩下 {{ deck.length + 1 }} 張・記住 {{ known }}</div>
      <button class="fc" :class="{ flipped }" aria-label="字卡，點一下翻面" @click="flip">
        <div class="fc-in">
          <div class="face front">
            <span class="kana" :style="{ fontSize: fitPx(cur.k, 120, 250) }">{{ cur.k }}</span>
            <span class="hint">想好怎麼唸，再點一下翻面</span>
          </div>
          <div class="face back">
            <span class="kana" :style="{ fontSize: fitPx(cur.k, 48, 240) }">{{ cur.k }}</span>
            <span class="rom">{{ cur.r }}</span>
            <span class="zy">{{ cur.z }}</span>
            <span v-if="cur.o" class="org">{{ cur.ol || '來源' }} <b>{{ cur.o }}</b></span>
          </div>
        </div>
      </button>
      <div class="hrow" style="justify-content: center">
        <template v-if="flipped">
          <button class="btn" @click="again">不熟，等一下再考</button>
          <button class="btn primary" @click="know">記住了</button>
          <button class="btn icon-btn" aria-label="再聽一次" @click="speak(cur.k)"><SpeakerIcon /></button>
        </template>
        <button v-else class="btn primary" @click="flip">翻面</button>
      </div>
      <p class="muted" style="font-size: 13px">鍵盤：空白鍵翻面・1 不熟・2 記住了</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onActivated, onDeactivated, ref, watch } from 'vue';
import type { KanaItem } from '@/data/types';
import { fitPx, shuffle } from '@/lib/kana';
import { speak } from '@/composables/useSpeech';
import { useProgressStore } from '@/stores/progress';
import ScopeChips from '@/components/ScopeChips.vue';
import SpeakerIcon from '@/components/SpeakerIcon.vue';

defineOptions({ name: 'FlashPage' });

const p = useProgressStore();
const deck = ref<KanaItem[]>([]);
const cur = ref<KanaItem | null>(null);
const flipped = ref(false);
const known = ref(0);
const againN = ref(0);

function start() {
  deck.value = shuffle(p.pool);
  cur.value = deck.value.shift() ?? null;
  flipped.value = false;
  known.value = 0;
  againN.value = 0;
}

function flip() {
  flipped.value = !flipped.value;
  if (flipped.value && cur.value) speak(cur.value.k);
}

function nextCard() {
  cur.value = deck.value.shift() ?? null;
  flipped.value = false;
}

/** 不熟的字放回去，3 張後再出現 */
function again() {
  if (!cur.value) return;
  againN.value++;
  deck.value.splice(Math.min(3, deck.value.length), 0, cur.value);
  nextCard();
}

function know() {
  if (!cur.value) return;
  known.value++;
  p.addMastery(cur.value.k);
  nextCard();
}

function onKey(e: KeyboardEvent) {
  if (!cur.value || (e.target as HTMLElement | null)?.closest('input,textarea')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    flip();
  } else if (flipped.value && e.key === '1') again();
  else if (flipped.value && e.key === '2') know();
}

// 解鎖新的一步後重新洗牌
watch(() => p.d.passed, start);
start();

onActivated(() => window.addEventListener('keydown', onKey));
onDeactivated(() => window.removeEventListener('keydown', onKey));
</script>
