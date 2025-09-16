// main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } = require('electron') // 确保导入 ipcMain
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { exec } = require('child_process')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
      show: true, 
    alwaysOnTop: true, // 置顶
    transparent: false, // 支持窗口透明
    frame: false, // 可选，false为无边框
    skipTaskbar: true, // 设置窗口不显示在任务栏中
  
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 不自动打开 DevTools
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite 默认端口
    // mainWindow.webContents.openDevTools();
  } else {
    const path = require('path');

    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 启用内容保护，防录屏
  mainWindow.setContentProtection(true)

  // 监听渲染进程设置透明度
  ipcMain.on('set-opacity', (event, opacity) => {
    if (typeof opacity === 'number' && opacity >= 0 && opacity <= 1) {
      mainWindow.setOpacity(opacity)
    }
  })

  // 注册全局快捷键
  function registerShortcuts() {
    // Ctrl+d 减少透明度
    globalShortcut.register('Control+D', () => {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (win) {
        let op = win.getOpacity();
        op = Math.max(0, op - 0.1);
        win.setOpacity(Number(op.toFixed(2)));
      }
    });
    // Ctrl+f 增加透明度
    globalShortcut.register('Control+f', () => {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (win) {
        let op = win.getOpacity();
        op = Math.min(1, op + 0.1);
        win.setOpacity(Number(op.toFixed(2)));
      }
    });
    // Ctrl+R 切换透明度 0 <-> 1
    globalShortcut.register('Control+R', () => {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (win) {
        const current = win.getOpacity();
        win.setOpacity(current < 0.05 ? 1 : 0);
      }
    });
    // Ctrl+Q 退出程序
    globalShortcut.register('Control+Q', () => {
      app.quit();
    });
    // 缩小
    globalShortcut.register('Control+1', () => {
      const [w, h] = mainWindow.getSize();
      mainWindow.setSize(Math.max(200, w - 50), Math.max(200, h - 50));
    });
    // 放大
    globalShortcut.register('Control+2', () => {
      const [w, h] = mainWindow.getSize();
      mainWindow.setSize(w + 50, h + 50);
    });
    // 左移
    globalShortcut.register('Control+Left', () => {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x - 50, y);
    });
    // 右移
    globalShortcut.register('Control+Right', () => {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x + 50, y);
    });
    // 上移
    globalShortcut.register('Control+Up', () => {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x, y - 50);
    });
    // 下移
    globalShortcut.register('Control+Down', () => {
      const [x, y] = mainWindow.getPosition();
      mainWindow.setPosition(x, y + 50);
    });
  }

  app.whenReady().then(registerShortcuts);

  // 退出时注销快捷键
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// 处理获取屏幕源的 IPC 调用
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    return sources
  } catch (error) {
    console.error('获取屏幕源失败:', error)
    throw error
  }
})

// 启动 Node.js 服务
function startServer() {
  exec('node main.js', { cwd: __dirname + '/../Server' }, (error, stdout, stderr) => {
    if (error) {
      console.error(`服务启动失败: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`服务错误输出: ${stderr}`);
      return;
    }
    console.log(`服务启动成功: ${stdout}`);
  });
}

app.on('ready', () => {
  // 启动 Node.js 服务
  startServer();

  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

console.log('Electron 主进程已启动');