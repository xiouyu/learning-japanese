<template>
  <q-dialog v-model="open">
    <q-card class="account-card">
      <q-card-section>
        <div class="account-title">朗讀語音</div>
        <p class="muted account-sub">
          假名和課本句子播的是課本的真人錄音；這裡選的是沒有錄音的單字要用哪個語音唸。設定只存在這台裝置。
        </p>
      </q-card-section>

      <q-card-section class="account-body">
        <q-option-group v-model="voiceChoice" :options="options" type="radio" dense class="voice-list" />
        <p v-if="isIOS" class="muted voice-tip">
          iPhone 建議選「跟著系統設定」：會用「設定 › 輔助使用 › 朗讀內容 › 聲音 › 日文」裡選的語音。下載的增強版語音不一定會出現在上面的清單，但選「跟著系統設定」就會用到。
        </p>
        <p v-else-if="!jaVoices.length" class="muted voice-tip">這台裝置找不到日文語音，會用系統預設的聲音唸，發音可能不正確。</p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps label="試聽" icon="volume_up" @click="speak('こんにちは。にほんごの べんきょう、がんばりましょう。')" />
        <q-btn unelevated no-caps color="primary" label="完成" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isIOS, jaVoices, speak, voiceChoice } from '@/composables/useSpeech';
import { voiceScore } from '@/lib/voice';

const open = defineModel<boolean>({ required: true });

function tag(v: SpeechSynthesisVoice) {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (voiceScore(v) < 0) return '（趣味語音，不建議）';
  if (/premium/.test(id)) return '（高品質）';
  if (/enhanced/.test(id)) return '（增強版）';
  return '';
}

const options = computed(() => [
  { label: isIOS ? '自動（跟著系統設定）' : '自動（挑最自然的語音）', value: 'auto' },
  ...(isIOS ? [] : [{ label: '跟著系統設定', value: 'system' }]),
  ...jaVoices.value.map((v) => ({ label: `${v.name}${tag(v)}`, value: v.voiceURI })),
]);
</script>
