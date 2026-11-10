import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const bridge = () => (window as any).folio

export const isElectron = !!(window as any).folio
export const isNativeAndroid = Capacitor.getPlatform() === 'android'
// ?android=1 lets you preview the Scan tab in a desktop browser while developing.
export const isAndroid = isNativeAndroid || new URLSearchParams(location.search).has('android')
/** True where Folio keeps its own library of saved files (the phone app and the desktop app). */
export const hasLibrary = isElectron || isNativeAndroid

export interface LibFile { name: string; size: number; mtime: number }
const LIB = 'library'

const toBase64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

function uniqueName(name: string, existing: Set<string>) {
  if (!existing.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 2
  while (existing.has(`${base} (${i})${ext}`)) i++
  return `${base} (${i})${ext}`
}

export async function libList(): Promise<LibFile[]> {
  if (isElectron) return bridge().lib.list()
  try {
    const r = await Filesystem.readdir({ path: LIB, directory: Directory.Data })
    return r.files
      .filter((f) => f.type === 'file')
      .map((f) => ({ name: f.name, size: Number(f.size), mtime: Number(f.mtime) || Date.now() }))
      .sort((a, b) => b.mtime - a.mtime)
  } catch {
    return [] // folder does not exist until the first save
  }
}

export async function libSave(name: string, bytes: Uint8Array): Promise<string> {
  if (isElectron) return bridge().lib.save(name, bytes)
  const existing = new Set((await libList()).map((f) => f.name))
  const finalName = uniqueName(name, existing)
  await Filesystem.writeFile({ path: `${LIB}/${finalName}`, data: toBase64(bytes), directory: Directory.Data, recursive: true })
  return finalName
}

export async function libRead(name: string): Promise<Uint8Array> {
  if (isElectron) return new Uint8Array(await bridge().lib.read(name))
  const r = await Filesystem.readFile({ path: `${LIB}/${name}`, directory: Directory.Data })
  return fromBase64(r.data as string)
}

export async function libDelete(name: string): Promise<void> {
  if (isElectron) return bridge().lib.delete(name)
  await Filesystem.deleteFile({ path: `${LIB}/${name}`, directory: Directory.Data })
}

/** Phone: open the share sheet. Desktop: reveal the file in its folder. */
export async function libShare(name: string): Promise<void> {
  if (isElectron) return bridge().lib.reveal(name)
  // The share sheet can only read from the cache folder, so hand it a temporary copy.
  const bytes = await libRead(name)
  await Filesystem.writeFile({ path: `share/${name}`, data: toBase64(bytes), directory: Directory.Cache, recursive: true })
  const { uri } = await Filesystem.getUri({ path: `share/${name}`, directory: Directory.Cache })
  await Share.share({ title: name, url: uri, dialogTitle: 'Share' })
}

/** Desktop only: save a copy somewhere else via a Save As dialog. */
export async function libExport(name: string): Promise<boolean> {
  return bridge().save(name, await libRead(name))
}

/**
 * Save a result. In the phone and desktop apps it goes into the Folio library first,
 * and nothing is sent anywhere until you choose to share it. In a plain browser it downloads.
 */
export async function saveFile(name: string, bytes: Uint8Array): Promise<boolean> {
  if (hasLibrary) {
    await libSave(name, bytes)
    return true
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return true
}

// ---- History of opened documents (copies kept in app storage, index in localStorage) ----
export interface HistEntry { id: string; name: string; size: number; tool: string; time: number }
const HKEY = 'folio.history'
const MAX_ENTRIES = 25
const MAX_BYTES = 200 * 1024 * 1024
const readIdx = (): HistEntry[] => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]') } catch { return [] } }
const writeIdx = (l: HistEntry[]) => { try { localStorage.setItem(HKEY, JSON.stringify(l)) } catch { /* storage unavailable */ } }

async function hFileWrite(id: string, bytes: Uint8Array) {
  if (isElectron) return bridge().hist.save(id, bytes)
  await Filesystem.writeFile({ path: `history/${id}`, data: toBase64(bytes), directory: Directory.Data, recursive: true })
}
async function hFileDelete(id: string) {
  if (isElectron) return bridge().hist.delete(id)
  await Filesystem.deleteFile({ path: `history/${id}`, directory: Directory.Data })
}

export const histList = (): HistEntry[] => readIdx().sort((a, b) => b.time - a.time)

/** Remember a document the user opened. Same name and size just moves it to the top. */
export async function histAdd(name: string, bytes: Uint8Array, tool: string): Promise<void> {
  if (!hasLibrary) return
  const list = readIdx()
  const dup = list.find((e) => e.name === name && e.size === bytes.length)
  if (dup) { dup.time = Date.now(); dup.tool = tool; writeIdx(list); return }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  await hFileWrite(id, bytes)
  list.unshift({ id, name, size: bytes.length, tool, time: Date.now() })
  let total = list.reduce((s, e) => s + e.size, 0)
  while (list.length > 1 && (list.length > MAX_ENTRIES || total > MAX_BYTES)) {
    const old = list.pop()!
    total -= old.size
    await hFileDelete(old.id).catch(() => {})
  }
  writeIdx(list)
}

export async function histRead(id: string): Promise<Uint8Array> {
  if (isElectron) return new Uint8Array(await bridge().hist.read(id))
  const r = await Filesystem.readFile({ path: `history/${id}`, directory: Directory.Data })
  return fromBase64(r.data as string)
}

export function histTouch(id: string, tool: string) {
  const list = readIdx()
  const e = list.find((x) => x.id === id)
  if (e) { e.time = Date.now(); e.tool = tool; writeIdx(list) }
}

export async function histDelete(id: string): Promise<void> {
  await hFileDelete(id).catch(() => {})
  writeIdx(readIdx().filter((e) => e.id !== id))
}

export async function histClear(): Promise<void> {
  for (const e of readIdx()) await hFileDelete(e.id).catch(() => {})
  writeIdx([])
}

// ---- Scanning: survive Android restarting the app while the scanner is open ----
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const RESUME_KEY = 'folio.resume'
export const markResume = (tool: string) => { try { localStorage.setItem(RESUME_KEY, JSON.stringify({ tool, t: Date.now() })) } catch { /* ignore */ } }
export const clearResume = () => { try { localStorage.removeItem(RESUME_KEY) } catch { /* ignore */ } }
/** If the app was restarted mid-scan, tell the app which tool to reopen (once, within 15 minutes). */
export function consumeResume(): string | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY)
    if (!raw) return null
    localStorage.removeItem(RESUME_KEY)
    const v = JSON.parse(raw)
    return Date.now() - v.t < 15 * 60 * 1000 ? v.tool : null
  } catch { return null }
}

export interface DraftPage { id: string; bytes: Uint8Array; type: 'png' | 'jpg' }
const DKEY = 'folio.scandraft'
const dIdx = (): { id: string; type: 'png' | 'jpg' }[] => { try { return JSON.parse(localStorage.getItem(DKEY) || '[]') } catch { return [] } }
const dPath = (id: string, type: string) => `scan-draft/${id}.${type}`
const persisted = new Set<string>()
let chain: Promise<unknown> = Promise.resolve()

async function doSync(pages: DraftPage[]) {
  const old = dIdx()
  const keep = new Set(pages.map((p) => p.id))
  for (const o of old) {
    if (!keep.has(o.id)) {
      await Filesystem.deleteFile({ path: dPath(o.id, o.type), directory: Directory.Data }).catch(() => {})
      persisted.delete(o.id)
    }
  }
  for (const p of pages) {
    if (!persisted.has(p.id) && !old.some((o) => o.id === p.id))
      await Filesystem.writeFile({ path: dPath(p.id, p.type), data: toBase64(p.bytes), directory: Directory.Data, recursive: true })
    persisted.add(p.id)
  }
  try { localStorage.setItem(DKEY, JSON.stringify(pages.map((p) => ({ id: p.id, type: p.type })))) } catch { /* ignore */ }
}
/** Keep the scanned pages on disk so they survive an app restart. Calls run one at a time. */
export function draftSync(pages: DraftPage[]): Promise<unknown> {
  if (!isNativeAndroid) return Promise.resolve()
  chain = chain.then(() => doSync(pages)).catch(() => {})
  return chain
}
export async function draftLoad(): Promise<DraftPage[]> {
  if (!isNativeAndroid) return []
  await chain
  const out: DraftPage[] = []
  for (const e of dIdx()) {
    try {
      const r = await Filesystem.readFile({ path: dPath(e.id, e.type), directory: Directory.Data })
      out.push({ id: e.id, type: e.type, bytes: fromBase64(r.data as string) })
      persisted.add(e.id)
    } catch { /* file gone */ }
  }
  return out
}

async function convertScan(res: any): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' }[]> {
  const out: { bytes: Uint8Array; type: 'png' | 'jpg' }[] = []
  for (const item of (res?.scannedImages ?? []) as string[]) {
    let bytes: Uint8Array
    // A JPEG in base64 also starts with '/', so tell the two apart by its '/9j/' signature.
    if ((item.startsWith('/') && !item.startsWith('/9j/')) || item.startsWith('file:')) {
      const r = await fetch(Capacitor.convertFileSrc(item))
      if (!r.ok) throw new Error('Could not read a scanned page from the device. Please try scanning again.')
      bytes = new Uint8Array(await r.arrayBuffer())
    } else {
      bytes = fromBase64(item.replace(/^data:image\/\w+;base64,/, ''))
    }
    const png = bytes[0] === 0x89 && bytes[1] === 0x50
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8
    if (!png && !jpg) throw new Error('A scanned page came back in an unexpected format. Please try scanning again.')
    out.push({ bytes, type: png ? 'png' : 'jpg' })
  }
  return out
}

/** Launch the native document scanner and return page images (JPEG/PNG bytes). */
export async function scanPages(): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' }[]> {
  markResume('scan') // if Android restarts the app while the scanner is open, we reopen on Scan
  try {
    // Kept in one place: if you swap scanner plugins, only this function changes.
    const mod: any = await import('@capgo/capacitor-document-scanner')
    const res = await mod.DocumentScanner.scanDocument({ maxNumDocuments: 24, responseType: 'imageFilePath' })
    return await convertScan(res)
  } finally {
    clearResume()
  }
}

/** If Android killed the app during a scan, Capacitor hands the result back on restart. Call once at startup. */
export function initRestore() {
  if (!isNativeAndroid) return
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appRestoredResult', (ev: any) => {
      if (ev?.methodName !== 'scanDocument' || !ev.success) return
      convertScan(ev.data)
        .then(async (got) => {
          const cur = await draftLoad()
          await draftSync([...cur, ...got.map((g) => ({ id: newId(), ...g }))])
          window.dispatchEvent(new Event('folio:scan-restored'))
        })
        .catch(() => {})
    })
  }).catch(() => {})
}
