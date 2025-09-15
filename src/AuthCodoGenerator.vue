<template>
  <div class="auth-code-container">
    <button @click="generateAuthCode" class="auth-code-btn">获取授权号码</button>
    <div v-if="authCode" class="auth-code-display">授权号码: {{ authCode }}</div>
    <div v-if="error" class="auth-code-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const authCode = ref('');
const error = ref('');

async function generateAuthCode() {
  try {
    const response = await axios.get('http://localhost:3000/generate-auth-code');
    authCode.value = response.data.authCode;
    error.value = '';
  } catch (err) {
    error.value = err.response?.data?.message || '获取授权号码失败';
  }
}
</script>

<style>
/* 添加样式 */
.auth-code-container {
  margin: 20px;
}
.auth-code-btn {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

</style>