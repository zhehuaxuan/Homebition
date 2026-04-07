import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
        redirect: '/about/profile'
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
