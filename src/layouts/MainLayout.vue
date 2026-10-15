<template>
  <div class="app">
    <header class="top">
      <div class="page-wrap">
        <div class="top-row">
          <h1>一步一步學習日文</h1>
          <div class="top-actions">
            <button v-if="sync.enabled" class="btn ghost sync-btn" :class="{ compact: sync.loggedIn }" :aria-label="syncLabel" :title="syncLabel" @click="account = true">
              <q-icon :name="syncIcon" size="18px" />
              <span class="sync-text">{{ syncLabel }}</span>
            </button>
            <button class="btn ghost icon-btn theme-btn" :aria-label="themeLabel" :title="themeLabel" @click="toggleTheme">
              <q-icon :name="$q.dark.isActive ? 'light_mode' : 'dark_mode'" size="20px" />
            </button>
          </div>
        </div>
        <p class="sub">
          いろどり 入門 A1 前的假名基礎。從平假名、濁音、拗音到片假名，共 {{ STEPS.length }} 步。通過每一步的解鎖測驗，才會開放下一步。
        </p>
        <ProgressStrip />
        <div v-if="voiceWarning" class="banner">{{ voiceWarning }}</div>
        <div v-if="offline" class="banner offline">目前沒有網路，可以照常練習，進度會先存在這台裝置。</div>
      </div>
    </header>

    <nav class="tabs" aria-label="功能">
      <div class="page-wrap">
        <q-tabs no-caps outside-arrows align="left" inline-label class="tabbar" active-class="tab-active" indicator-color="transparent">
          <q-route-tab v-for="t in TABS" :key="t.to" :to="t.to" :label="t.label" :ripple="false" />
        </q-tabs>
      </div>
    </nav>

    <main>
      <div class="page-wrap">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </main>

    <AccountDialog v-if="sync.enabled" v-model="account" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { STEPS } from '@/data';
import { initSpeech, voiceWarning } from '@/composables/useSpeech';
import { useSyncStore } from '@/stores/sync';
import { saveTheme, type ThemePref } from '@/lib/theme';
import ProgressStrip from '@/components/ProgressStrip.vue';
import AccountDialog from '@/components/AccountDialog.vue';

const TABS = [
  { to: '/learn', label: '學習' },
  { to: '/flash', label: '字卡' },
  { to: '/quiz', label: '測驗' },
  { to: '/words', label: '單字' },
  { to: '/table', label: '五十音表' },
];

const sync = useSyncStore();
const $q = useQuasar();
const account = ref(false);

// 點信裡的登入連結回來後，顯示登入結果
watch(
  () => sync.linkNotice,
  (n) => {
    if (!n) return;
    $q.notify({ type: n.ok ? 'positive' : 'negative', message: n.message, timeout: n.ok ? 3000 : 0, actions: n.ok ? [] : [{ label: '知道了', color: 'white' }] });
    if (!n.ok) account.value = true;
    sync.linkNotice = null;
  },
  { immediate: true },
);
const offline = ref(!navigator.onLine);

const syncLabel = computed(() => {
  if (!sync.loggedIn) return '登入同步';
  return { syncing: '同步中', synced: '已同步', offline: '離線', error: '同步失敗', idle: '已登入' }[sync.status];
});
const syncIcon = computed(() => {
  if (!sync.loggedIn) return 'cloud_off';
  return { syncing: 'cloud_sync', synced: 'cloud_done', offline: 'cloud_off', error: 'sync_problem', idle: 'cloud' }[sync.status];
});

// 深色／淺色切換：點一下就換成另一種，並記在這台裝置
const themeLabel = computed(() => ($q.dark.isActive ? '切換成淺色' : '切換成深色'));
function toggleTheme() {
  const next: ThemePref = $q.dark.isActive ? 'light' : 'dark';
  $q.dark.set(next === 'dark');
  saveTheme(next);
}

const setOnline = () => (offline.value = !navigator.onLine);
onMounted(() => {
  initSpeech();
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOnline);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', setOnline);
  window.removeEventListener('offline', setOnline);
});
</script>
