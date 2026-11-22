// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    {
      path: '/account',
      component: () => import('../views/AccountView.vue'),
      beforeEnter: (_to, _from, next) => {
        // Check auth state here; the API still authorizes every request.
        next();
      },
    },
  ],
});

export default router;
