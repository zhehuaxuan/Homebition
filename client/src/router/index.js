import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/mail-test',
    name: 'MailTest',
    component: () => import('../views/MailTest.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/articles',
    name: 'MyArticles',
    component: () => import('../views/MyArticles.vue')
  },
  {
    path: '/tasks',
    name: 'MyTasks',
    component: () => import('../views/MyTasks.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
    // 二级子路由
    children: [
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/about/Profile.vue')
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('../views/about/Devices.vue')
      },
      {
        path: 'article-list',
        name: 'ArticleList',
        component: () => import('../views/about/ArticleList.vue')
      }, {
        path: 'task-list',
        name: 'TaskList',
        component: () => import('../views/about/Task.vue')
      }, {
        path: 'tag-list',
        name: 'TagList',
        component: () => import('../views/about/Tag.vue')
      }, {
        path: 'subscription-list',
        name: 'SubscriptionList',
        component: () => import('../views/about/Subscription.vue')
      },{
        path: 'daily-summary',
        name: 'DailySummary',
        component: () => import('../views/about/DailySummary.vue')
      },{
        path: 'daily-review',
        name: 'DailyReview',
        component: () => import('../views/about/DailyReview.vue')
      },{
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/about/Dashboard.vue')
      },{
        path: 'review-config',
        name: 'ReviewConfig',
        component: () => import('../views/about/ReviewConfig.vue')
      },{
        path: '/article/add',
        name: 'ArticleAdd',
        component: () => import('../views/article/ArticleEdit.vue')
      },
      {
        path: '/article/edit/:id',
        name: 'ArticleEdit',
        component: () => import('../views/article/ArticleEdit.vue')
      },
      {
        path: '',
        redirect: '/about/task-list'
      }
    ]
  },
  {
    path: '/invest',
    name: 'Invest',
    component: () => import('../views/invest/Invest.vue'),
    children: [
      {
        path: 'enterprise',
        name: 'Enterprise',
        component: () => import('../views/invest/Enterprise.vue')
      },
      {
        path: 'market',
        name: 'Market',
        component: () => import('../views/invest/Market.vue')
      },
      {
        path: '',
        redirect: '/invest/enterprise'
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
