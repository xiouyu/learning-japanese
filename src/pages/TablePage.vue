<template>
  <section class="panel">
    <div class="stephead">
      <div class="eyebrow">{{ kata ? '片假名' : '平假名' }} 46 個</div>
      <h2 style="letter-spacing: 0.04em; font-size: 28px">五十音表</h2>
      <p class="lead muted">實線框是已經解鎖的字，點一下聽發音。虛線淡色的是之後會學到的。</p>
    </div>
    <div class="hrow" aria-label="切換">
      <button class="chip" :aria-pressed="!kata" @click="p.setTmode('hira')">平假名</button>
      <button class="chip" :aria-pressed="kata" @click="p.setTmode('kata')">片假名</button>
    </div>
    <div class="legend">
      <span>藍框：字卡「記住了」3 次以上</span>
      <span>例外：{{ kata ? 'シ（shi）、チ（chi）、ツ（tsu）、フ（fu）' : 'し（shi）、ち（chi）、つ（tsu）、ふ（fu）' }}</span>
    </div>
    <div class="tscroll">
      <div class="gt">
        <span />
        <span v-for="v in ['a', 'i', 'u', 'e', 'o']" :key="v" class="rh">{{ v }}</span>
        <template v-for="[h, cells, step] in GOJUON" :key="h">
          <span class="rh">{{ h === 'ん' ? cv('ん') : h }}</span>
          <template v-for="(c, ci) in cells" :key="`${h}${ci}`">
            <span v-if="!c" class="gc empty" />
            <button
              v-else
              class="gc"
              :class="{ off: !p.availSet.has(cv(c[0])), done: p.availSet.has(cv(c[0])) && (p.d.mastery[cv(c[0])] ?? 0) >= 3 }"
              @click="tap(cv(c[0]), step + (kata ? 20 : 0))"
            >
              <span class="kana">{{ cv(c[0]) }}</span><span class="mono">{{ c[1] }}</span>
            </button>
          </template>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { ALL_KANA, GOJUON } from '@/data';
import { toKata } from '@/lib/kana';
import { say } from '@/composables/useAudio';
import { useProgressStore } from '@/stores/progress';

defineOptions({ name: 'TablePage' });

const p = useProgressStore();
const $q = useQuasar();
const kata = computed(() => p.d.tmode === 'kata');
const cv = (t: string) => (kata.value ? toKata(t) : t);

function tap(ch: string, step: number) {
  if (p.availSet.has(ch)) say(ALL_KANA.find((k) => k.k === ch) ?? {}, ch);
  else $q.notify({ message: `第 ${step} 步會學到這個字` });
}
</script>
