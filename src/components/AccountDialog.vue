<template>
  <q-dialog v-model="open">
    <q-card class="account-card">
      <q-card-section>
        <div class="account-title">同步進度</div>
        <p class="muted account-sub">登入後，手機和電腦會接著同一個進度學。沒網路時照常存在這台裝置，連上網路會自動同步。</p>
      </q-card-section>

      <!-- 已登入 -->
      <q-card-section v-if="sync.loggedIn" class="account-body">
        <div>帳號：<b>{{ sync.user?.email }}</b></div>
        <div class="muted">{{ statusText }}</div>
        <div v-if="sync.status === 'error'" class="account-err">{{ sync.errorMsg }}</div>
      </q-card-section>

      <!-- 輸入 Email -->
      <q-card-section v-else-if="stage === 'email'" class="account-body">
        <q-input
          v-model="email"
          type="email"
          label="Email"
          outlined
          dense
          autocomplete="email"
          :disable="busy"
          @keyup.enter="send"
        />
        <p class="muted" style="font-size: 13px">我們會寄一封登入信到這個信箱，不需要設定密碼。</p>
      </q-card-section>

      <!-- 等待點連結，或輸入驗證碼 -->
      <q-card-section v-else class="account-body">
        <p>登入信已寄到 <b>{{ email }}</b>。</p>
        <p>
          請<b>用這台裝置</b>打開信，點信裡的「Sign in」連結，就會回到網站並自動登入。連結 1 小時內有效，只能用一次。
        </p>
        <p class="muted" style="font-size: 13px">沒收到的話，看一下垃圾郵件匣。信裡如果有 6 位數驗證碼，也可以直接填在下面。</p>
        <q-input
          v-model="code"
          label="驗證碼（選填）"
          outlined
          dense
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="10"
          :disable="busy"
          @keyup.enter="verify"
        />
      </q-card-section>

      <q-card-actions align="right">
        <template v-if="sync.loggedIn">
          <q-btn flat no-caps label="登出" :disable="busy" @click="logout" />
          <q-btn unelevated no-caps color="primary" label="立即同步" :loading="sync.status === 'syncing'" @click="sync.syncNow()" />
        </template>
        <template v-else-if="stage === 'email'">
          <q-btn flat no-caps label="取消" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="寄驗證碼" :loading="busy" :disable="!validEmail" @click="send" />
        </template>
        <template v-else>
          <q-btn flat no-caps label="重新寄信" :disable="busy" @click="stage = 'email'" />
          <q-btn unelevated no-caps color="primary" label="用驗證碼登入" :loading="busy" :disable="code.trim().length < 6" @click="verify" />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useSyncStore } from '@/stores/sync';

const open = defineModel<boolean>({ required: true });

const sync = useSyncStore();
const $q = useQuasar();
const stage = ref<'email' | 'code'>('email');
const email = ref('');
const code = ref('');
const busy = ref(false);

const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));

const statusText = computed(() => {
  switch (sync.status) {
    case 'syncing':
      return '同步中…';
    case 'offline':
      return '目前離線，連上網路後會自動同步。';
    case 'error':
      return '同步失敗，稍後會再試一次。';
    case 'synced':
      return sync.lastSyncedAt ? `已同步・${new Date(sync.lastSyncedAt).toLocaleTimeString('zh-TW')}` : '已同步';
    default:
      return '';
  }
});

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function send() {
  if (!validEmail.value || busy.value) return;
  busy.value = true;
  try {
    email.value = email.value.trim();
    await sync.sendCode(email.value);
    stage.value = 'code';
    code.value = '';
  } catch (e) {
    const msg = errText(e);
    $q.notify({
      type: 'negative',
      message: /rate limit|security purposes/i.test(msg) ? '寄信太頻繁了，請過一下子再試（免費方案每小時只能寄幾封）。' : `寄送失敗：${msg}`,
    });
  } finally {
    busy.value = false;
  }
}

async function verify() {
  if (code.value.trim().length < 6 || busy.value) return;
  busy.value = true;
  try {
    await sync.verifyCode(email.value, code.value.trim());
    stage.value = 'email';
    $q.notify({ type: 'positive', message: '登入成功，正在同步進度' });
  } catch (e) {
    $q.notify({ type: 'negative', message: `驗證碼不正確或已過期：${errText(e)}` });
  } finally {
    busy.value = false;
  }
}

async function logout() {
  busy.value = true;
  try {
    await sync.signOut();
    $q.notify({ message: '已登出。這台裝置上的進度會保留。' });
  } finally {
    busy.value = false;
  }
}
</script>
