/**
 * 解析登入連結帶回來的網址 hash。
 *
 * 點了信裡的登入連結後，Supabase 會導回網站，並在 hash 帶上登入資料：
 *   成功：#access_token=...&refresh_token=...&type=magiclink
 *   失敗：#error=access_denied&error_code=otp_expired&error_description=...
 * 網站用 hash 路由，路由啟動時可能先把它改成 #/access_token=...，兩種都要能讀。
 */
export type AuthRedirect =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; code: string; description: string }
  | null;

export function parseAuthRedirect(hash: string): AuthRedirect {
  const raw = hash.replace(/^#\/?/, '');
  if (!/(^|&)(access_token|error|error_code)=/.test(raw)) return null;
  const q = new URLSearchParams(raw);
  const accessToken = q.get('access_token');
  const refreshToken = q.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
  return {
    kind: 'error',
    code: q.get('error_code') ?? q.get('error') ?? 'unknown',
    description: q.get('error_description') ?? '',
  };
}

/** 給使用者看的錯誤說明 */
export function authErrorMessage(code: string): string {
  if (code === 'otp_expired') return '登入連結已過期或已經用過了，請重新寄一封登入信。';
  if (code === 'access_denied') return '登入連結無效，請重新寄一封登入信。';
  return `登入失敗（${code}），請重新寄一封登入信。`;
}
