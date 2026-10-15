<template>
  <div class="hrow" aria-label="練習範圍">
    <span class="muted" style="font-size: 14px">範圍</span>
    <template v-if="avail.length > 1">
      <button class="chip ghostchip" @click="setAll">全部</button>
      <button class="chip ghostchip" @click="setLatest">只練最新一步</button>
    </template>
    <button
      v-for="s in avail"
      :key="s.id"
      class="chip"
      :aria-pressed="p.d.scope.includes(s.id)"
      @click="toggle(s.id)"
    >
      <span class="kn">{{ s.row }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { STEPS } from '@/data';
import { useProgressStore } from '@/stores/progress';

const emit = defineEmits<{ change: [] }>();
const p = useProgressStore();
const $q = useQuasar();
const avail = computed(() => STEPS.filter((s) => s.id <= p.curU));

function apply(ids: number[]) {
  p.setScope(ids);
  emit('change');
}
const setAll = () => apply(avail.value.map((s) => s.id));
const setLatest = () => apply([p.curU]);
function toggle(id: number) {
  const scope = p.d.scope;
  if (scope.includes(id)) {
    if (scope.length === 1) {
      $q.notify({ message: '至少要選一行' });
      return;
    }
    apply(scope.filter((x) => x !== id));
  } else apply([...scope, id]);
}
</script>
