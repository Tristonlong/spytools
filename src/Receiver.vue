<template>
  <div>
    <h1>老师端</h1>
    <video ref="remoteVideo" autoplay playsinline controls style="width:80%;height:auto;"></video>
    <div>发送答案</div>
  <textarea v-model="inputMsg" placeholder="输入内容，可换行，Ctrl+Enter发送" class="big-input" rows="4" @keydown.enter.ctrl="sendMsg"></textarea>
  <button class="big-btn" @click="sendMsg">Send</button>
  <button class="back-btn" @click="goBack">返回登录</button>


 </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
function goBack() {
  router.push('/login')
}
const emit = defineEmits(['send-message'])
const inputMsg = ref('')


let messageWs = null;
let videoWs = null;



// 建立消息 WebSocket 连接
function connectMessageWebSocket() {
    messageWs = new WebSocket('ws://localhost:8080/message');

    messageWs.onopen = () => {
      
        console.log('消息 WebSocket 已连接');
    };

    messageWs.onclose = () => {
     
        console.log('消息 WebSocket 已关闭');
    };

    messageWs.onerror = (error) => {
        
        console.error('消息 WebSocket 错误:', error);
    };

    // 监听断开连接消息
    messageWs.onmessage = (event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            console.warn('收到非 JSON 消消息:', event.data);
            return;
        }

        if (data.type === 'disconnect') {
            videoWsStatus.value = '未连接';
            console.log('收到断开连接消息，更新状态为未连接');
        } else {
            console.log('收到消息:', data);
        }
    };
}

// 建立视频流 WebSocket 连接
function connectVideoWebSocket() {
    videoWs = new WebSocket('ws://localhost:8080/video');

    videoWs.onopen = () => {
        updateVideoWsStatus();
        console.log('视频流 WebSocket 已连接');
    };

    videoWs.onclose = () => {
        updateVideoWsStatus();
        console.log('视频流 WebSocket 已关闭');
    };

    videoWs.onerror = (error) => {
        updateVideoWsStatus();
        console.error('视频流 WebSocket 错误:', error);
    };
}

// 发送消息
function sendMsg() {
    if (messageWs && messageWs.readyState === WebSocket.OPEN) {
        if (inputMsg.value.trim()) {
            messageWs.send(inputMsg.value.trim());
            console.log('消息已发送:', inputMsg.value.trim());
            inputMsg.value = ''; // 清空输入框
        } else {
            console.warn('输入消息为空，未发送');
        }
    } else {
        console.error('消息 WebSocket 未连接或未打开');
    }
}

const remoteVideo = ref(null)
let pc = null
let ws = null
let iceCandidateQueue = [];

// 处理信令消息
const startReceiving = () => {
  ws = new WebSocket("ws://localhost:8080")

  ws.onopen = () => console.log("已连接信令服务器，等待发送端推流")

ws.onmessage = async (event) => {
  let dataString; // 用于存储最终要解析的字符串

  // 判断消息数据类型并转换为字符串
  if (event.data instanceof Blob) {
    // 如果收到的是 Blob，使用 FileReader 读取为文本
    try {
      dataString = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(event.data);
      });
    } catch (err) {
      console.error("读取 Blob 数据失败:", err);
      return;
    }
  } else if (typeof event.data === 'string') {
    // 如果收到的是字符串，直接使用
    dataString = event.data;
  } else {
    console.warn("收到未知类型数据，忽略:", event.data);
    return;
  }

  // 尝试解析为 JSON
  let msg;
  try {
    msg = JSON.parse(dataString);
  } catch (err) {
    console.warn("收到非 JSON 字符串数据，忽略:", dataString);
    return;
  }

  // 处理正常的信令消息
  if (msg.type === "offer") {
    pc = new RTCPeerConnection();

    pc.ontrack = (e) => {
      if (remoteVideo.value) {
        remoteVideo.value.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(msg));
    console.log("远程描述已设置");

    // 添加缓存的候选者
    while (iceCandidateQueue.length > 0) {
      const candidate = iceCandidateQueue.shift();
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify(answer));
    console.log("发送 answer");

  } else if (msg.type === "candidate") {
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    } else {
      iceCandidateQueue.push(msg.candidate); // 缓存候选者
    }
  }
};
}


onMounted(() => {
  startReceiving()
  connectMessageWebSocket()
  connectVideoWebSocket()
})
onBeforeUnmount(() => {
  if (pc) pc.close()
  if (messageWs) {
    messageWs.close()
    messageWs = null
  }
  if (videoWs) {
    videoWs.close()
    videoWs = null
  }
})
</script>

<style>
  .big-input {
    font-size: 1.2em;
    padding: 0.7em 1em;
    width: 800px;
    height: 200px;
    margin-top: 20px;
    margin-bottom: 10px;
    border-radius: 6px;
    border: 1px solid #aaa;
    box-sizing: border-box;
    resize: none;
    line-height: 1.6;
  }
  .big-btn {
    font-size: 1.2em;
    padding: 0.5em 1.5em;
    margin-left: 10px;
    border-radius: 6px;
    background: blue;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .big-btn:hover {
    background: blue;
  }
  .back-btn {
    margin-top: 30px;
    padding: 8px 24px;
    font-size: 1.1em;
    border-radius: 6px;
    background: #42b983;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .back-btn:hover {
    background: #369870;
  }
  .receiver-container {
    border: 1px solid #ccc;
    padding: 20px;
    margin: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  input {
    margin-right: 10px;
    padding: 5px;
    font-size: 1em;
  }
  button {
    padding: 5px 10px;
    font-size: 1em;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover {
    background-color: #369870;
  }
  .websocket-status {
    margin-top: 20px;
    font-size: 1.1em;
    color: #333;
  }
</style>