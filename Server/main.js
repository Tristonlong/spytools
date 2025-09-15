// signaling-server.js
const WebSocket = require('ws')
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // 引入 cors 中间件

const app = express();
app.use(bodyParser.json());
app.use(cors()); // 启用 CORS

const wss = new WebSocket.Server({ port: 8080 })
const clients = new Map() // 使用 Map 存储客户端及其 ID

// 密钥，用于生成和验证 JWT
const jwtSecret = 'your-jwt-secret-key';

// 存储当前授权码
let currentAuthCode = 'default-password';

// 生成唯一 ID
function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9)
}

// 心跳检测
function heartbeat() {
  this.isAlive = true
} 

wss.on('connection', ws => {
  const clientId = generateUniqueId()
  clients.set(clientId, ws)
  ws.isAlive = true
  ws.on('pong', heartbeat)

  console.log(`新客户端连接: ${clientId}`)

  ws.on('message', msg => {
    let parsedMsg
    try {
      parsedMsg = JSON.parse(msg)
    } catch (e) {
      console.error('收到无效消息:', msg)
      return
    }

    // 处理不同类型的消息
    if (parsedMsg.type === 'disconnect') {
      console.log(`客户端 ${clientId} 请求断开`)
      ws.close()
    } else {
      // 广播消息
      for (const [id, client] of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg)
        }
      }
    }
  })

  ws.on('close', () => {
    clients.delete(clientId)
    console.log(`客户端断开: ${clientId}`)
  })

  ws.on('error', error => {
    console.error(`客户端 ${clientId} 错误:`, error)
  })
})

// 定期检测客户端是否存活
setInterval(() => {
  for (const [id, ws] of clients) {
    if (!ws.isAlive) {
      console.log(`客户端 ${id} 未响应，断开连接`)
      ws.terminate()
      clients.delete(id)
    } else {
      ws.isAlive = false
      ws.ping()
    }
  }
}, 30000)

// 登录接口
app.post('/login', (req, res) => {
    const { authCode, role } = req.body; // 确保前端传递了 role

    if (!authCode) {
        return res.status(400).json({ success: false, message: '授权码不能为空' });
    }

    if (authCode === currentAuthCode) {
        // 生成有效期为一天的 JWT，包含角色信息
        const token = jwt.sign({ authCode, role }, jwtSecret, { expiresIn: '1d' });
        return res.json({ success: true, token });
    } else {
        return res.status(401).json({ success: false, message: '授权码错误' });
    }
});

// 验证 JWT 接口
app.post('/verify-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: '令牌不能为空' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        return res.json({ success: true, message: '令牌有效', data: decoded });
    } catch (err) {
        return res.status(401).json({ success: false, message: '令牌无效' });
    }
});

// 修改授权码接口
app.post('/update-auth', (req, res) => {
    const { newAuthCode } = req.body;

    if (!newAuthCode) {
        return res.status(400).json({ success: false, message: '新授权码不能为空' });
    }

    currentAuthCode = newAuthCode;
    return res.json({ success: true, message: '授权码已更新' });
});

// 新增学生和老师的登录验证接口
app.post('/role-login', (req, res) => {
    const { authCode } = req.body; // 前端传递授权码

    if (!authCode) {
        return res.status(400).json({ success: false, message: '授权码不能为空' });
    }

    // 检查授权码是否匹配
    if (authCode === currentAuthCode) {
        return res.json({ success: true, message: '登录成功' });
    } else {
        return res.status(401).json({ success: false, message: '授权码无效' });
    }
});

// 获取授权码接口
app.get('/generate-auth-code', (req, res) => {
    const newAuthCode = Math.random().toString(36).substr(2, 6); // 生成随机6位授权码
    currentAuthCode = newAuthCode; // 更新全局授权码

    // 生成 JWT，包含授权码信息
    const token = jwt.sign({ authCode: newAuthCode }, jwtSecret, { expiresIn: '1d' });

    res.json({ success: true, authCode: newAuthCode, token }); // 返回授权码和完整的 JWT
});

// 启动 Express 服务
app.listen(3000, () => {
    console.log('授权服务启动，监听端口 3000');
});

console.log('信令服务器启动 ws://localhost:8080')
