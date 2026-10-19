<template>
  <section class="panel">
    <div class="stephead">
      <div class="eyebrow">Can-do 自我檢核・《いろどり》入門（A1）</div>
      <h2 style="letter-spacing: 0.04em; font-size: 28px">我做得到嗎？</h2>
      <p class="lead muted">
        課本每一課最後都有「能做到的事」清單。學完一課就回來給自己打星：★ 還是很難、★★ 做到了、★★★ 做得很好。再按一次同樣的星數可以取消。還沒學到的課不能打星。
      </p>
    </div>

    <div class="cd-sum">
      <div><b>{{ ratedN }}</b> / {{ CANDO.length }} 項已檢核</div>
      <div class="muted">★★★ {{ countOf(3) }}・★★ {{ countOf(2) }}・★ {{ countOf(1) }}</div>
      <p v-if="hard.length" class="muted">
        還是很難的有 {{ hard.length }} 項，點「去複習」回到那一步再練練看。
      </p>
      <p v-else-if="ratedN === CANDO.length" class="muted">79 項都做到了！可以放心往初級前進。</p>
    </div>

    <div class="hrow" aria-label="篩選">
      <button v-for="f in FILTERS" :key="f.id" class="chip" :aria-pressed="filter === f.id" @click="filter = f.id">
        {{ f.t }}
      </button>
    </div>

    <div v-for="g in groups" :key="g.lesson" class="sec">
      <h3>{{ g.part }}</h3>
      <ul class="cd-list">
        <li v-for="c in g.items" :key="c.n" class="cd-item" :class="{ locked: !open(c) }">
          <div class="cd-head">
            <span class="cd-n">{{ c.n }}</span>
            <span class="kana cd-t">{{ c.title }}</span>
          </div>
          <p class="cd-zh">{{ c.zh }}</p>
          <p class="muted cd-ja">{{ c.ja }}</p>
          <div class="hrow">
            <div class="cd-stars" role="group" :aria-label="`第 ${c.n} 項的自我評價`">
              <button
                v-for="s in 3"
                :key="s"
                class="cd-star"
                :class="{ on: (p.d.cando[c.n] ?? 0) >= s }"
                :aria-pressed="p.d.cando[c.n] === s"
                :aria-label="STAR_LABEL[s - 1]"
                :title="STAR_LABEL[s - 1]"
                :disabled="!open(c)"
                @click="p.rateCando(c.n, s)"
              >
                ★
              </button>
              <span class="muted cd-lbl">{{ open(c) ? (p.d.cando[c.n] ? STAR_LABEL[p.d.cando[c.n]! - 1] : '還沒檢核') : '還沒學到' }}</span>
            </div>
            <button v-if="open(c)" class="btn ghost cd-go" @click="review(c)">去複習</button>
          </div>
        </li>
      </ul>
    </div>
    <p v-if="!groups.length" class="muted">沒有符合的項目。</p>
    <p class="muted credit">Can-do 出處：《いろどり 生活の日本語》入門（A1）Can-do チェック ©The Japan Foundation</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CANDO, STEPS, candoStep } from '@/data';
import type { CanDo } from '@/data/types';
import { useProgressStore } from '@/stores/progress';

defineOptions({ name: 'CheckPage' });

const p = useProgressStore();
const router = useRouter();

const STAR_LABEL = ['還是很難', '做到了', '做得很好'];
const FILTERS = [
  { id: 'all', t: '全部' },
  { id: 'todo', t: '還沒檢核' },
  { id: 'hard', t: '還是很難' },
] as const;
const filter = ref<(typeof FILTERS)[number]['id']>('all');

/** 每一項要複習的步驟（只算一次） */
const stepOf = new Map(CANDO.map((c) => [c.n, candoStep(c)]));
/** 學到那一步了才能檢核 */
const open = (c: CanDo) => stepOf.get(c.n)! <= p.curU;

const ratedN = computed(() => CANDO.filter((c) => p.d.cando[c.n]).length);
const countOf = (s: number) => CANDO.filter((c) => p.d.cando[c.n] === s).length;
const hard = computed(() => CANDO.filter((c) => p.d.cando[c.n] === 1));

const groups = computed(() => {
  const shown = CANDO.filter((c) =>
    filter.value === 'todo' ? open(c) && !p.d.cando[c.n] : filter.value === 'hard' ? p.d.cando[c.n] === 1 : true,
  );
  const lessons = [...new Set(shown.map((c) => c.lesson))];
  return lessons.map((lesson) => ({
    lesson,
    part: STEPS.find((s) => s.id === stepOf.get(shown.find((c) => c.lesson === lesson)!.n))!.part,
    items: shown.filter((c) => c.lesson === lesson),
  }));
});

function review(c: CanDo) {
  p.setStep(stepOf.get(c.n)!);
  void router.push('/learn');
  window.scrollTo(0, 0);
}
</script>
