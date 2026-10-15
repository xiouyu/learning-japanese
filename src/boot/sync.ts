import { defineBoot } from '#q-app';
import { useSyncStore } from '@/stores/sync';

/** 啟動時恢復登入狀態，已登入就先同步一次 */
export default defineBoot(({ store }) => {
  void useSyncStore(store).init();
});
