import { register } from 'register-service-worker';
import { Notify } from 'quasar';

// Service worker：第一次開啟後把網站存到裝置上，之後沒網路也能用。
// 網站有新版時提示重新整理。
register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
  cached() {
    Notify.create({ message: '已存到這台裝置，之後沒網路也能練習' });
  },

  updated() {
    Notify.create({
      message: '網站有新版本',
      timeout: 0,
      actions: [
        { label: '重新整理', color: 'white', handler: () => window.location.reload() },
        { label: '稍後', color: 'white' },
      ],
    });
  },

  error(err) {
    // 離線時檢查更新失敗是正常的，不用報錯
    if (navigator.onLine) console.error('Service worker 註冊失敗：', err);
  },
});
