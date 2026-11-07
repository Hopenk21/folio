const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('folio', {
  save: (name, bytes) => ipcRenderer.invoke('save', name, bytes),
  lib: {
    save: (name, bytes) => ipcRenderer.invoke('lib:save', name, bytes),
    list: () => ipcRenderer.invoke('lib:list'),
    read: (name) => ipcRenderer.invoke('lib:read', name),
    delete: (name) => ipcRenderer.invoke('lib:delete', name),
    reveal: (name) => ipcRenderer.invoke('lib:reveal', name),
  },
})
