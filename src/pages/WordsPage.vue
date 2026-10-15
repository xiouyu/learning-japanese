<template>
  <section class="panel">
    <div class="stephead">
      <div class="eyebrow">全部 {{ list.length }} 個單字</div>
      <h2 style="letter-spacing: 0.04em; font-size: 28px">唸唸看</h2>
      <p class="lead muted">這些單字只用到你已經解鎖的假名。先自己唸出來，再看答案或聽發音確認。</p>
    </div>
    <div class="hrow">
      <button class="btn" @click="revealAll = !revealAll">{{ revealAll ? '全部隱藏答案' : '全部顯示答案' }}</button>
      <button class="btn ghost" @click="reshuffle">打亂順序</button>
    </div>
    <WordList :words="shown" :reveal-all="revealAll" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { STEPS } from '@/data';
import type { Word } from '@/data/types';
import { shuffle } from '@/lib/kana';
import { useProgressStore } from '@/stores/progress';
import WordList from '@/components/WordList.vue';

defineOptions({ name: 'WordsPage' });

const p = useProgressStore();
const revealAll = ref(false);

/** 已解鎖步驟的單字（重複的只留一個） */
const list = computed(() => {
  const seen = new Set<string>();
  const out: Word[] = [];
  for (const s of STEPS.filter((s) => s.id <= p.curU)) {
    for (const w of s.words) {
      if (seen.has(w.w)) continue;
      seen.add(w.w);
      out.push(w);
    }
  }
  return out;
});

const shown = ref<Word[]>(list.value);
watch(list, (l) => (shown.value = l));

function reshuffle() {
  shown.value = shuffle(list.value);
  revealAll.value = false;
}
</script>
