<template>
  <div>
    <Receiver />
    <Provide />
    <AuthCodeGenerator />
  </div>
</template>
<script setup>
import Receiver from './Receiver.vue'
import Provide from './Provide.vue'
import AuthCodeGenerator from './AuthCodoGenerator.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
function goBack() {
  router.push('/login')
}
</script>




