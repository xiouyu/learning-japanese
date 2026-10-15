import { describe, expect, it } from 'vitest';
import { authErrorMessage, parseAuthRedirect } from '@/lib/authRedirect';

describe('parseAuthRedirect', () => {
  it('讀出登入連結帶回來的 token', () => {
    expect(parseAuthRedirect('#access_token=aaa&expires_in=3600&refresh_token=bbb&token_type=bearer&type=magiclink')).toEqual({
      kind: 'session',
      accessToken: 'aaa',
      refreshToken: 'bbb',
    });
  });

  it('路由先把網址改成 #/access_token=... 也讀得到', () => {
    expect(parseAuthRedirect('#/access_token=aaa&refresh_token=bbb')).toMatchObject({ kind: 'session' });
  });

  it('連結過期時回傳錯誤', () => {
    const r = parseAuthRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(r).toEqual({ kind: 'error', code: 'otp_expired', description: 'Email link is invalid or has expired' });
    expect(authErrorMessage('otp_expired')).toContain('過期');
  });

  it('一般的頁面網址不受影響', () => {
    expect(parseAuthRedirect('')).toBeNull();
    expect(parseAuthRedirect('#/learn')).toBeNull();
    expect(parseAuthRedirect('#/quiz?unlock=3')).toBeNull();
  });
});
