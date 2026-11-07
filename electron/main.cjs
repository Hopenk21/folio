const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')

const libDir = () => {
  const d = path.join(app.getPath('documents'), 'Folio')
  fs.mkdirSync(d, { recursive: true })
  return d
}
const safeName = (n) => path.basename(String(n))

function createWindow() {
  const logo = path.join(__dirname, '..', 'dist', 'logo.png')
  const win = new BrowserWindow({
    width: 1120, height: 760, minWidth: 820, minHeight: 560,
    backgroundColor: '#f6f5f1', icon: fs.existsSync(logo) ? logo : undefined,
    autoHideMenuBar: true, title: 'Folio',
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

// Library: files live in Documents\Folio
ipcMain.handle('lib:save', (_e, name, bytes) => {
  const dir = libDir()
  const clean = safeName(name)
  const ext = path.extname(clean)
  const base = path.basename(clean, ext)
  let final = clean
  for (let i = 2; fs.existsSync(path.join(dir, final)); i++) final = `${base} (${i})${ext}`
  fs.writeFileSync(path.join(dir, final), Buffer.from(bytes))
  return final
})
ipcMain.handle('lib:list', () => {
  const dir = libDir()
  return fs.readdirSync(dir)
    .map((name) => ({ name, st: fs.statSync(path.join(dir, name)) }))
    .filter((f) => f.st.isFile())
    .map((f) => ({ name: f.name, size: f.st.size, mtime: f.st.mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
})
ipcMain.handle('lib:read', (_e, name) => fs.readFileSync(path.join(libDir(), safeName(name))))
ipcMain.handle('lib:delete', (_e, name) => { fs.unlinkSync(path.join(libDir(), safeName(name))) })
ipcMain.handle('lib:reveal', (_e, name) => { shell.showItemInFolder(path.join(libDir(), safeName(name))) })

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
