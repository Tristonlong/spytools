<template>
    <div class="provide-container">
        <h1>学生端</h1>
        <button @click="startStreaming" :disabled="isStreaming">开始</button>
        <button @click="stopStreaming" :disabled="!isStreaming">停止</button>
        <div style="margin-top:20px;padding:10px;border:1px solid #ccc;min-height:40px;">
            <b>接收端消息：</b>
            <span>{{ receivedMessage }}</span>
        </div>
        <div style="margin-top:20px;">
            <label>窗口透明度: {{ opacity }}</label>
            <input type="range" min="0.2" max="1" step="0.01" v-model.number="opacity" @input="setOpacity" />
        </div>
        <button class="back-btn" @click="goBack">返回登录</button>
        <div style="margin-top:20px;">
            <b>WebSocket 状态：</b>
            <div>消息 WebSocket: {{ messageWsStatus }}</div>
            <div>视频流 WebSocket: {{ videoWsStatus }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const receivedMessage = ref('')
const router = useRouter()

const props = defineProps({
    receivedMessage: { type: String, default: '' }
})

let messageWs = null;
let videoWs = null;
let pc = null
let finalStream = null

const isStreaming = ref(false)
const opacity = ref(1)
const messageWsStatus = ref('未连接');
const videoWsStatus = ref('未连接');

// 更新 WebSocket 状态
function updateMessageWsStatus() {
    messageWsStatus.value = messageWs && messageWs.readyState === WebSocket.OPEN ? '已连接' : '未连接';
}

function updateVideoWsStatus() {
    videoWsStatus.value = videoWs && videoWs.readyState === WebSocket.OPEN ? '已连接' : '未连接';
}

function setOpacity() {
    if (window.electronAPI && window.electronAPI.setOpacity) {
        window.electronAPI.setOpacity(opacity.value)
    }
}

// 建立消息 WebSocket 连接
function connectMessageWebSocket() {
    messageWs = new WebSocket('ws://localhost:8080/message');

    messageWs.onmessage = (event) => {
        let data = event.data;
        if (data instanceof Blob) {
            data.text().then((text) => {
                try {
                    receivedMessage.value = JSON.parse(text);
                } catch (e) {
                    receivedMessage.value = text; // 如果不是 JSON，直接显示文本
                }
            });
        } else {
            try {
                receivedMessage.value = JSON.parse(data);
            } catch (e) {
                receivedMessage.value = data; // 如果不是 JSON，直接显示文本
            }
        }
    };

    messageWs.onopen = () => {
        updateMessageWsStatus();
        console.log('消息 WebSocket 已连接');
    };

    messageWs.onclose = () => {
        updateMessageWsStatus();
        console.log('消息 WebSocket 已关闭');
    };

    messageWs.onerror = (error) => {
        updateMessageWsStatus();
        console.error('消息 WebSocket 错误:', error);
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

// 停止操作，断开所有 WebSocket 连接
const stopAllConnections = () => {
    if (messageWs) {
        messageWs.close();
        messageWs = null;
    }
    if (videoWs) {
        videoWs.close();
        videoWs = null;
    }
    console.log('所有 WebSocket 连接已断开');
};

// 返回登录时断开所有 WebSocket 连接
function goBack() {
    stopAllConnections();
    router.push('/login');
}

// 开始操作，重新连接所有 WebSocket
const startAllConnections = () => {
    connectMessageWebSocket();
    connectVideoWebSocket();
    console.log('所有 WebSocket 连接已重新建立');
};

// 在组件加载时连接 WebSocket
onMounted(() => {
    connectMessageWebSocket();
    connectVideoWebSocket();
});

// 开始推流
const startStreaming = async () => {
    try {
        startAllConnections(); // 重新连接 WebSocket

        const sources = await window.electronAPI.getScreenSources();
        const primaryScreen = sources.find(
            s => s.name.includes('整个屏幕') || s.name.includes('Screen 1')
        ) || sources[0];

        if (!primaryScreen) throw new Error('未找到屏幕源');

        // 获取屏幕流 + 系统声音
        const screenStream = await navigator.mediaDevices.getUserMedia({
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: primaryScreen.id
                }
            },
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: primaryScreen.id
                }
            }
        });

        // 获取麦克风流
        let micStream = null;
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            console.warn('没有获取到麦克风:', e);
        }

        // 混合音频
        if (micStream) {
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            const systemAudio = audioContext.createMediaStreamSource(screenStream);
            const micAudio = audioContext.createMediaStreamSource(micStream);
            systemAudio.connect(destination);
            micAudio.connect(destination);

            finalStream = new MediaStream([
                ...screenStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
            ]);
        } else {
            finalStream = screenStream;
        }

        // ----------------------
        // WebRTC 推流
        // ----------------------
        pc = new RTCPeerConnection();

        // 添加 track
        finalStream.getTracks().forEach(track => pc.addTrack(track, finalStream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        videoWs.send(JSON.stringify(offer));

        // ICE candidate 发送给信令服务器
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                videoWs.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };

        let iceCandidateQueue = [];

        // 处理信令消息
        videoWs.onmessage = async (event) => {
            let dataString;
            if (event.data instanceof Blob) {
                dataString = await event.data.text();
            } else {
                dataString = event.data;
            }

            let msg;
            try {
                msg = JSON.parse(dataString);
            } catch (err) {
                console.warn("收到非 JSON 字符串数据，忽略:", dataString);
                return;
            }

            if (msg.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(msg));
                console.log("远程描述已设置");

                // 添加缓存的候选者
                while (iceCandidateQueue.length > 0) {
                    const candidate = iceCandidateQueue.shift();
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }

            } else if (msg.type === "candidate") {
                if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                } else {
                    iceCandidateQueue.push(msg.candidate); // 缓存候选者
                }
            }
        };

        videoWs.onopen = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            videoWs.send(JSON.stringify(offer));
        };

        isStreaming.value = true;
    } catch (err) {
        console.error('推流失败', err);
    }
}

// 停止推流
const stopStreaming = () => {
    // 停止推流时发送断开消息
    if (messageWs && messageWs.readyState === WebSocket.OPEN) {
        messageWs.send(JSON.stringify({ type: 'disconnect' }));
        console.log('发送断开连接消息');
    }
    stopAllConnections();
    updateMessageWsStatus();
    updateVideoWsStatus();
    if (pc) {
        pc.close();
        pc = null;
    }
    if (finalStream) {
        finalStream.getTracks().forEach(track => track.stop());
        finalStream = null;
    }
    isStreaming.value = false;
    console.log('推流已停止');
}

onBeforeUnmount(() => {
    stopStreaming()
    stopAllConnections()
})
</script>
<style lang="css" scoped>
.provide-container {
    border: 1px solid #ccc;
    padding: 20px;
    margin: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
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
</style>