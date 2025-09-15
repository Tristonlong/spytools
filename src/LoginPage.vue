<template>
  <div class="login-container">
    <div class="login-box">
      <h2>登录</h2>
      <input v-model="username" placeholder="账号" class="login-input" />
      <input v-model="password" placeholder="密码" type="password" class="login-input" @keyup.enter="login" />
      <input v-model="token" placeholder="令牌" class="login-input" />
      <button @click="login" class="login-btn">登录</button>
      <div v-if="loginError" class="login-error">{{ loginError }}</div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const username = ref('');
const password = ref('');
const token = ref('');
const loginError = ref('');
const router = useRouter();

async function login() {
  if (username.value === '1' && password.value === '1') {
    // 管理员登录逻辑
    router.push('/admin');
  } else if (username.value === '2' || username.value === '3') {
    // 学生或老师登录逻辑
    console.log('AuthCode being sent:', token.value); // 打印授权码
    if (!token.value) {
      loginError.value = '授权码不能为空';
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/role-login', {
        authCode: token.value, // 修改为传递 authCode
      });

      // 登录成功后跳转
      router.push(username.value === '2' ? '/student' : '/teacher');
    } catch (error) {
      // 提供更详细的错误信息
      loginError.value = error.response?.data?.message || '登录失败，请检查授权码或网络连接';
    }
  } else {
    loginError.value = '账号或密码错误';
  }
}
</script>
<style>

</style>