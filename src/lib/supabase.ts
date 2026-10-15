import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.QCLI_SUPABASE_URL;
const key = import.meta.env.QCLI_SUPABASE_ANON_KEY;

/** 沒設定 Supabase 時是 null，網站照常運作，只是不能登入同步 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
