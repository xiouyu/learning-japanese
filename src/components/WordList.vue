<template>
  <div class="words">
    <div v-for="w in words" :key="w.w" class="word">
      <div class="w">{{ w.w }}</div>
      <div v-show="isShown(w.w)" class="ans"><span class="mono">{{ w.r }}</span>{{ w.m }}</div>
      <div class="ctl">
        <button class="btn icon-btn" :aria-label="`播放 ${w.w}`" @click="say(w, w.w)"><SpeakerIcon /></button>
        <button class="btn" @click="toggle(w.w)">{{ isShown(w.w) ? '隱藏' : '看答案' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { Word } from '@/data/types';
import { say } from '@/composables/useAudio';
import SpeakerIcon from './SpeakerIcon.vue';

const props = defineProps<{ words: Word[]; revealAll?: boolean }>();

/** 個別切換過的答案；按「全部顯示／隱藏」時清空 */
const shown = reactive(new Map<string, boolean>());
const isShown = (w: string) => shown.get(w) ?? props.revealAll ?? false;
const toggle = (w: string) => shown.set(w, !isShown(w));

watch(
  () => [props.revealAll, props.words],
  () => shown.clear(),
);
</script>
