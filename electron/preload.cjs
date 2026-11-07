const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('folio', {
  save: (name, bytes) => ipcRenderer.invoke('save', name, bytes),
})
