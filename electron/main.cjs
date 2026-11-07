const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1120, height: 760, minWidth: 820, minHeight: 560,
    backgroundColor: '#f6f5f1', icon: fs.existsSync(path.join(__dirname, '..', 'dist', 'logo.png')) ? path.join(__dirname, '..', 'dist', 'logo.png') : undefined, autoHideMenuBar: true, title: 'Folio',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('save', async (_e, name, bytes) => {
  const ext = path.extname(name).slice(1) || '*'
  const r = await dialog.showSaveDialog({ defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  if (r.canceled || !r.filePath) return false
  fs.writeFileSync(r.filePath, Buffer.from(bytes))
  return true
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
