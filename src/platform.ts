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

/** Launch the native document scanner and return page images (JPEG/PNG bytes). */
export async function scanPages(): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' }[]> {
  // Kept in one place: if you swap scanner plugins, only this function changes.
  const mod: any = await import('@capgo/capacitor-document-scanner')
  const res = await mod.DocumentScanner.scanDocument({ maxNumDocuments: 24, responseType: 'imageFilePath' })
  const out: { bytes: Uint8Array; type: 'png' | 'jpg' }[] = []
  for (const item of (res?.scannedImages ?? []) as string[]) {
    let bytes: Uint8Array
    if (item.startsWith('/') || item.startsWith('file:')) {
      bytes = new Uint8Array(await (await fetch(Capacitor.convertFileSrc(item))).arrayBuffer())
    } else {
      bytes = fromBase64(item.replace(/^data:image\/\w+;base64,/, ''))
    }
    out.push({ bytes, type: bytes[0] === 0x89 ? 'png' : 'jpg' })
  }
  return out
}
