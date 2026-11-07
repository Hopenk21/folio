import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export type Bytes = Uint8Array

const load = (b: Bytes) => PDFDocument.load(b, { ignoreEncryption: true })
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
// Standard PDF fonts only cover Latin-1; swap anything else so drawing never throws.
const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

export async function pageCount(b: Bytes) {
  return (await load(b)).getPageCount()
}

export async function mergePdfs(files: Bytes[]): Promise<Bytes> {
  const out = await PDFDocument.create()
  for (const f of files) {
    const src = await load(f)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }
  return out.save()
}

/** "1-3, 5" -> [0,1,2,4] (zero-based). Throws a readable error. */
export function parseRanges(spec: string, total: number): number[] {
  const out: number[] = []
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`Can't read "${part}". Use a format like 1-3, 5`)
    const a = +m[1]
    const b = m[2] ? +m[2] : a
    if (a < 1 || b < a || b > total) throw new Error(`"${part}" is outside 1–${total}`)
    for (let i = a; i <= b; i++) out.push(i - 1)
  }
  if (!out.length) throw new Error('Enter at least one page')
  return out
}

export async function extractPages(b: Bytes, indices: number[]): Promise<Bytes> {
  const src = await load(b)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, indices)
  pages.forEach((p) => out.addPage(p))
  return out.save()
}

export async function splitEvery(b: Bytes, n: number): Promise<Bytes[]> {
  const total = await pageCount(b)
  const parts: Bytes[] = []
  for (let i = 0; i < total; i += n) parts.push(await extractPages(b, range(i, Math.min(i + n, total))))
  return parts
}

export interface PageEdit { index: number; rotate: number }

/** Build a new PDF from an ordered list of source pages, each with an extra rotation. */
export async function organize(b: Bytes, edits: PageEdit[]): Promise<Bytes> {
  const src = await load(b)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, edits.map((e) => e.index))
  pages.forEach((p, i) => {
    const angle = (((p.getRotation().angle + edits[i].rotate) % 360) + 360) % 360
    p.setRotation(degrees(angle))
    out.addPage(p)
  })
  return out.save()
}

export async function watermark(b: Bytes, text: string, opacity: number): Promise<Bytes> {
  const doc = await load(b)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const label = safe(text)
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const size = Math.min(width, height) / 7
    const w = font.widthOfTextAtSize(label, size)
    const t = Math.PI / 4
    const drop = size * 0.3
    page.drawText(label, {
      x: width / 2 - (w / 2) * Math.cos(t) + drop * Math.sin(t),
      y: height / 2 - (w / 2) * Math.sin(t) - drop * Math.cos(t),
      size, font, rotate: degrees(45), color: rgb(0.45, 0.45, 0.45), opacity,
    })
  }
  return doc.save()
}

export async function addPageNumbers(b: Bytes): Promise<Bytes> {
  const doc = await load(b)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  pages.forEach((page, i) => {
    const label = `${i + 1} / ${pages.length}`
    const w = font.widthOfTextAtSize(label, 10)
    page.drawText(label, { x: (page.getWidth() - w) / 2, y: 20, size: 10, font, color: rgb(0.3, 0.3, 0.3) })
  })
  return doc.save()
}

/** Lossless tidy-up: object streams + stripped metadata. Does not recompress images. */
export async function optimize(b: Bytes): Promise<Bytes> {
  const doc = await load(b)
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('Folio')
  doc.setCreator('Folio')
  return doc.save({ useObjectStreams: true })
}

export async function imagesToPdf(images: { bytes: Bytes; type: 'png' | 'jpg' }[]): Promise<Bytes> {
  const doc = await PDFDocument.create()
  for (const im of images) {
    const img = im.type === 'png' ? await doc.embedPng(im.bytes) : await doc.embedJpg(im.bytes)
    const scale = 595 / img.width // A4 width in points
    const page = doc.addPage([595, img.height * scale])
    page.drawImage(img, { x: 0, y: 0, width: 595, height: img.height * scale })
  }
  return doc.save()
}
