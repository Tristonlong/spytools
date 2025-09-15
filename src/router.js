import { createRouter, createWebHashHistory } from 'vue-router'
import Provide from './Provide.vue'
import Receiver from './Receiver.vue'
import AdminPage from './AdminPage.vue'
import LoginPage from './LoginPage.vue'

const routes = [
  { path: '/login', component: LoginPage },
  { path: '/student', component: Provide },
  { path: '/teacher', component: Receiver },
  { path: '/admin', component: AdminPage },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router