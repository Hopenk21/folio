const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('folio', {
  save: (name, bytes) => ipcRenderer.invoke('save', name, bytes),
  hist: {
    save: (id, bytes) => ipcRenderer.invoke('hist:save', id, bytes),
    read: (id) => ipcRenderer.invoke('hist:read', id),
    delete: (id) => ipcRenderer.invoke('hist:delete', id),
  },
  lib: {
    save: (name, bytes) => ipcRenderer.invoke('lib:save', name, bytes),
    list: () => ipcRenderer.invoke('lib:list'),
    read: (name) => ipcRenderer.invoke('lib:read', name),
    delete: (name) => ipcRenderer.invoke('lib:delete', name),
    reveal: (name) => ipcRenderer.invoke('lib:reveal', name),
  },
})
