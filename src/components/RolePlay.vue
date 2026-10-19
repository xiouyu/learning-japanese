<template>
  <q-dialog v-model="open" @hide="stopAudio">
    <q-card class="account-card rp-card">
      <q-card-section>
        <div class="account-title">角色扮演・{{ dialog.label }}</div>
        <p class="muted account-sub">錄音會唸對方的台詞，輪到你的時候換你說。說完可以聽原音對照。</p>
      </q-card-section>

      <!-- 選角色 -->
      <q-card-section v-if="!me" class="account-body">
        <p>你想演哪一個人？</p>
        <div class="hrow">
          <button v-for="w in roles" :key="w" class="btn primary" @click="begin(w)">我演 {{ w }}</button>
        </div>
        <label class="rp-opt">
          <input v-model="hideMine" type="checkbox" />
          輪到我時只看中文意思（比較難）
        </label>
      </q-card-section>

      <q-card-section v-else class="account-body">
        <ol class="rp-lines">
          <li
            v-for="(l, li) in dialog.lines"
            :key="li"
            :class="{ mine: l.who === me, cur: li === idx, past: li < idx }"
          >
            <span class="who">{{ l.who }}</span>
            <span>
              <template v-if="l.who === me && hideMine && li >= idx && !(li === idx && heard)">
                <span class="muted">（{{ l.m || '換你說' }}）</span>
              </template>
              <template v-else>
                <span class="kana dt">{{ l.t }}</span>
                <span v-if="l.m" class="muted dm">{{ l.m }}</span>
              </template>
            </span>
          </li>
        </ol>

        <div v-if="idx < dialog.lines.length" class="rp-ctl">
          <template v-if="cur!.who === me">
            <p class="rp-turn">換你說了！{{ hideMine && !heard ? '看中文，用日文說出來。' : '看著台詞唸出來。' }}</p>
            <div class="hrow">
              <button class="btn" @click="hearMine"><SpeakerIcon /> 聽原音</button>
              <button class="btn primary" @click="advance">說完了，下一句 →</button>
            </div>
          </template>
          <p v-else class="muted rp-turn"><SpeakerIcon /> {{ cur!.who }} 正在說…</p>
        </div>
        <div v-else class="rp-ctl">
          <p class="rp-turn">演完了！再演一次，或換另一個角色試試。</p>
          <div class="hrow">
            <button class="btn primary" @click="begin(me)">再演一次</button>
            <button class="btn" @click="me = ''">換角色</button>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat no-caps label="關閉" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Dialog } from '@/data/types';
import { playAudio, stopAudio } from '@/composables/useAudio';
import SpeakerIcon from './SpeakerIcon.vue';

const props = defineProps<{ dialog: Dialog }>();
const open = defineModel<boolean>({ required: true });

const roles = computed(() => [...new Set(props.dialog.lines.map((l) => l.who).filter((w): w is string => !!w))]);
const me = ref('');
const hideMine = ref(false);
const idx = ref(0);
/** 自己這一句已經聽過原音了 */
const heard = ref(false);
const cur = computed(() => props.dialog.lines[idx.value]);

/** 播第 i 句的錄音 */
function playLine(i: number, onDone?: () => void) {
  const l = props.dialog.lines[i];
  const src = props.dialog.audio?.src;
  if (!l?.at || !src) return onDone?.();
  playAudio({ src, start: l.at[0], end: l.at[1] }, l.t, onDone);
}

/** 對方的台詞自動播，播完就換下一句；輪到自己就停下來等 */
function run() {
  heard.value = false;
  const l = cur.value;
  if (!l || l.who === me.value) return;
  const at = idx.value;
  playLine(at, () => {
    if (idx.value !== at || !open.value) return;
    // 停一下再接下一句，比較像真的對話
    setTimeout(() => {
      if (idx.value === at && open.value) advance();
    }, 400);
  });
}

function begin(w: string) {
  me.value = w;
  idx.value = 0;
  run();
}

function advance() {
  stopAudio();
  idx.value++;
  run();
}

function hearMine() {
  heard.value = true;
  playLine(idx.value);
}

watch(open, (v) => {
  if (!v) {
    stopAudio();
    me.value = '';
  }
});
</script>
