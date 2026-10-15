<template>
  <div class="prog" aria-label="學習進度">
    <div class="cellsets">
      <div v-for="r in rows" :key="r.label" class="cellrow">
        <span class="cl">{{ r.label }}</span>
        <div class="cells">
          <i v-for="n in TOTAL" :key="n" :class="n <= r.done ? 'on' : n <= r.done + r.cur ? 'cur' : ''" />
        </div>
      </div>
    </div>
    <div class="lbl">平假名 {{ rows[0]!.done }} / {{ TOTAL }}・片假名 {{ rows[1]!.done }} / {{ TOTAL }}・{{ tail }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ALL_KANA, BASE, BASE_K, ROADMAP, STEPS, TOTAL, stepLabel } from '@/data';
import { useProgressStore } from '@/stores/progress';

const p = useProgressStore();

const rows = computed(() =>
  (
    [
      ['ひ', BASE],
      ['カ', BASE_K],
    ] as const
  ).map(([label, set]) => {
    const U = p.curU;
    const passed = p.d.passed;
    const done = ALL_KANA.filter((k) => k.step <= passed && set.has(k.k)).length;
    const cur = U > passed ? ALL_KANA.filter((k) => k.step === U && set.has(k.k)).length : 0;
    return { label, done, cur };
  }),
);

const tail = computed(() => {
  const passed = p.d.passed;
  if (passed >= STEPS.length) {
    const nx = ROADMAP.find((r) => r.n === passed + 1);
    return nx?.ext ? '假名全部學完了！接下來回到課本第 1 課' : `第 ${passed + 1} 步內容準備中`;
  }
  return `正在學第 ${p.curU} 步・${stepLabel(p.curU)}`;
});
</script>
