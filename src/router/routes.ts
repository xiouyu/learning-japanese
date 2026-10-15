import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/learn' },
      { path: 'learn', component: () => import('@/pages/LearnPage.vue') },
      { path: 'flash', component: () => import('@/pages/FlashPage.vue') },
      { path: 'quiz', component: () => import('@/pages/QuizPage.vue') },
      { path: 'words', component: () => import('@/pages/WordsPage.vue') },
      { path: 'table', component: () => import('@/pages/TablePage.vue') },
    ],
  },
  // 舊版網址（#learn、#quiz…）或打錯的網址都回到學習頁
  { path: '/:catchAll(.*)*', redirect: '/learn' },
];

export default routes;
