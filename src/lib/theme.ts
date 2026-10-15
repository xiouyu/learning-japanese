/** 深色／淺色主題：使用者選過就記在這台裝置，沒選過就跟著系統設定 */
export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'gojuon:theme';

export function loadTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveTheme(t: ThemePref) {
  try {
    if (t === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* 私密瀏覽時就不記 */
  }
}

/** Quasar Dark.set 用的值 */
export const toDarkSetting = (t: ThemePref): boolean | 'auto' => (t === 'auto' ? 'auto' : t === 'dark');
