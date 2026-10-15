import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { User } from '@supabase/supabase-js';
import { STEPS } from '@/data';
import { supabase } from '@/lib/supabase';
import { mergeProgress, normalize, sameProgress, type ProgressData } from '@/lib/progress';
import { useProgressStore } from './progress';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * 跨裝置同步：用 Email 驗證碼登入 Supabase，進度存在 progress 資料表（每個帳號一列）。
 * 沒網路時照常存在本機，連上網路後自動合併上傳。
 */
export const useSyncStore = defineStore('sync', () => {
  const enabled = supabase !== null;
  const user = ref<User | null>(null);
  const status = ref<SyncStatus>('idle');
  const lastSyncedAt = ref<number | null>(null);
  const errorMsg = ref('');
  const loggedIn = computed(() => user.value !== null);

  const progress = useProgressStore();
  let running = false;
  let again = false;
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = false;

  async function syncNow(): Promise<void> {
    if (!supabase || !user.value) return;
    if (!navigator.onLine) {
      status.value = 'offline';
      return;
    }
    if (running) {
      again = true;
      return;
    }
    running = true;
    status.value = 'syncing';
    try {
      const uid = user.value.id;
      const { data, error } = await supabase.from('progress').select('data').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      const local = progress.snapshot();
      const remote = normalize((data?.data ?? null) as Partial<ProgressData> | null, STEPS.length);
      const merged = mergeProgress(local, remote);
      if (!sameProgress(merged, local)) {
        applying = true;
        progress.replace(merged);
        applying = false;
      }
      const out = progress.snapshot();
      if (!data || !sameProgress(out, remote)) {
        const { error: upErr } = await supabase
          .from('progress')
          .upsert({ user_id: uid, data: out, updated_at: new Date().toISOString() });
        if (upErr) throw upErr;
      }
      status.value = 'synced';
      lastSyncedAt.value = Date.now();
      errorMsg.value = '';
    } catch (e) {
      status.value = navigator.onLine ? 'error' : 'offline';
      errorMsg.value = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    } finally {
      applying = false;
      running = false;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  }

  async function init() {
    if (!supabase || started) return;
    started = true;
    const { data } = await supabase.auth.getSession();
    user.value = data.session?.user ?? null;
    supabase.auth.onAuthStateChange((event, session) => {
      user.value = session?.user ?? null;
      if (event === 'SIGNED_IN') void syncNow();
      if (event === 'SIGNED_OUT') status.value = 'idle';
    });
    window.addEventListener('online', () => void syncNow());
    window.addEventListener('offline', () => {
      if (user.value) status.value = 'offline';
    });
    // 進度有變化就在 1.5 秒後上傳（連續操作只傳一次）
    watch(
      () => progress.d,
      () => {
        if (applying || !user.value) return;
        clearTimeout(timer);
        timer = setTimeout(() => void syncNow(), 1500);
      },
      { deep: true },
    );
    if (user.value) void syncNow();
  }

  /** 寄出 6 位數登入驗證碼 */
  async function sendCode(email: string) {
    if (!supabase) throw new Error('尚未設定同步服務');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
  }

  async function verifyCode(email: string, token: string) {
    if (!supabase) throw new Error('尚未設定同步服務');
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    user.value = null;
    lastSyncedAt.value = null;
  }

  return { enabled, user, loggedIn, status, lastSyncedAt, errorMsg, init, syncNow, sendCode, verifyCode, signOut };
});
