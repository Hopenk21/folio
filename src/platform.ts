import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

// ?android=1 lets you preview the Scan tab in a desktop browser while developing.
export const isAndroid =
  Capacitor.getPlatform() === 'android' || new URLSearchParams(location.search).has('android')

const toBase64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Save a file the right way for the platform. Returns false if the user cancelled. */
export async function saveFile(name: string, bytes: Uint8Array): Promise<boolean> {
  const bridge = (window as any).folio
  if (bridge) return bridge.save(name, bytes)

  if (Capacitor.getPlatform() === 'android') {
    const res = await Filesystem.writeFile({ path: name, data: toBase64(bytes), directory: Directory.Cache })
    try {
      await Share.share({ title: name, url: res.uri, dialogTitle: 'Save or share' })
      return true
    } catch {
      return false
    }
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
      const b64 = item.replace(/^data:image\/\w+;base64,/, '')
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    }
    out.push({ bytes, type: bytes[0] === 0x89 ? 'png' : 'jpg' })
  }
  return out
}
