/**
 * 自訂環境變數的型別。
 * https://quasar.dev/quasar-cli-vite/handling-import-meta-env#type-inference
 */
interface ImportMetaEnv {
  /** Supabase 專案網址，例如 https://xxxx.supabase.co（沒設定就不啟用同步） */
  readonly QCLI_SUPABASE_URL?: string;
  /** Supabase 的 anon（publishable）key，可以公開放在前端 */
  readonly QCLI_SUPABASE_ANON_KEY?: string;
}
