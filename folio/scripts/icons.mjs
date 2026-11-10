// Drop your Canva export at assets/icon.png (square PNG, 1024x1024 recommended).
// This copies it to where the web app, Windows build and Android icon generator expect it.
import fs from 'node:fs'

const src = 'assets/icon.png'
if (!fs.existsSync(src)) {
  console.log('[icons] assets/icon.png not found, using the built-in mark')
  process.exit(0)
}
fs.mkdirSync('public', { recursive: true })
fs.mkdirSync('build', { recursive: true })
fs.copyFileSync(src, 'public/logo.png')
fs.copyFileSync(src, 'build/icon.png')
fs.copyFileSync(src, 'assets/icon-only.png')
console.log('[icons] logo installed from assets/icon.png')
