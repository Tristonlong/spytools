const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  setOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity)
})
