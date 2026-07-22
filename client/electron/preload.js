const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  setBackendUrl: (url) => ipcRenderer.invoke('set-backend-url', url),
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
  onNotification: (callback) => {
    ipcRenderer.on('notification', (_event, data) => callback(data))
  }
})
