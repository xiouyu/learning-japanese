import { defineBoot } from '#q-app';
import { Dark } from 'quasar';
import { loadTheme, toDarkSetting } from '@/lib/theme';

/** 畫面出現前先套用記住的深色／淺色設定，避免閃一下 */
export default defineBoot(() => {
  Dark.set(toDarkSetting(loadTheme()));
});
