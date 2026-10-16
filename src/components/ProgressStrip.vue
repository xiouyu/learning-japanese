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
    // 課本的步驟也會出現單一假名（例如數字「に」），同一個字只算一次
    const count = (upTo: number) => new Set(ALL_KANA.filter((k) => k.step <= upTo && set.has(k.k)).map((k) => k.k)).size;
    const done = count(passed);
    const cur = U > passed ? count(U) - done : 0;
    return { label, done, cur };
  }),
);

const tail = computed(() => {
  const passed = p.d.passed;
  if (passed >= STEPS.length) {
    const nx = ROADMAP.find((r) => r.n === passed + 1);
    return nx?.ext ? `目前的內容全部學完了！下一站：${nx.row}（準備中）` : `第 ${passed + 1} 步內容準備中`;
  }
  if (p.examDue) return '假名學完了！下一關：五十音大會考';
  return `正在學第 ${p.curU} 步・${stepLabel(p.curU)}`;
});
</script>
