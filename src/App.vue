<template>
  <div>
  <router-view />
  </div>
</template>
<script setup>
</script>

<script setup>

</script>

<style>

body, html, #app {
  background: #cccccc !important;
  width: 800px;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.login-box {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  padding: 40px 30px 30px 30px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.login-input {
  width: 220px;
  padding: 10px;
  margin: 10px 0;
  border-radius: 6px;
  border: 1px solid #aaa;
  font-size: 1.1em;
}
.login-btn {
  width: 100%;
  padding: 10px;
  background: #42b983;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}
.login-btn:hover {
  background: #369870;
}
.login-error {
  color: red;
  margin-top: 10px;
}

</style>
