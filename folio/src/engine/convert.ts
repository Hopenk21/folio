import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx'
import mammoth from 'mammoth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { loadPdf } from './render'

type Bytes = Uint8Array

/**
 * PDF -> Word. PDFs store positioned text, not paragraphs, so this rebuilds lines and
 * paragraphs from text positions. Text PDFs convert reasonably; tables, columns and
 * scanned pages will not. Throws if the PDF has no text layer.
 */
export async function pdfToDocx(bytes: Bytes): Promise<Bytes> {
  const pdf = await loadPdf(bytes)
  const children: Paragraph[] = []
  let anyText = false

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items = (content.items as any[]).filter((i) => typeof i.str === 'string' && i.str.trim() !== '')
    if (!items.length) continue
    anyText = true

    const heights = items.map((i) => i.height as number).sort((a, b) => a - b)
    const median = heights[Math.floor(heights.length / 2)] || 10

    // group into lines by baseline
    const lines: { y: number; h: number; parts: any[] }[] = []
    for (const it of items) {
      const y = it.transform[5] as number
      const line = lines.find((l) => Math.abs(l.y - y) < Math.max(2, it.height * 0.4))
      if (line) line.parts.push(it)
      else lines.push({ y, h: it.height, parts: [it] })
    }
    lines.sort((a, b) => b.y - a.y)

    let current: { text: string; big: boolean }[] = []
    const flush = () => {
      if (!current.length) return
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: current.map(
            (c, i) => new TextRun({ text: (i ? ' ' : '') + c.text, bold: c.big, size: c.big ? 28 : 22 }),
          ),
        }),
      )
      current = []
    }

    let prevY: number | null = null
    for (const line of lines) {
      line.parts.sort((a, b) => a.transform[4] - b.transform[4])
      let text = ''
      let lastEnd = -Infinity
      for (const part of line.parts) {
        const x = part.transform[4] as number
        if (text && x - lastEnd > 1.5 && !part.str.startsWith(' ') && !text.endsWith(' ')) text += ' '
        text += part.str
        lastEnd = x + (part.width as number)
      }
      const big = line.h > median * 1.25
      if (prevY !== null && prevY - line.y > Math.max(line.h, median) * 1.9) flush()
      current.push({ text: text.trim(), big })
      prevY = line.y
    }
    flush()
    if (p < pdf.numPages) children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  if (!anyText) throw new Error('This PDF has no selectable text (it is probably a scan), so it cannot be converted.')

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  return new Uint8Array(await blob.arrayBuffer())
}

const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

/**
 * Word -> PDF. Reads the .docx with mammoth and lays out headings, paragraphs and bullet
 * lists. Fonts, tables, images and page layout from the original are NOT preserved.
 */
export async function docxToPdf(bytes: Bytes): Promise<Bytes> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes.slice().buffer as ArrayBuffer })
  const dom = new DOMParser().parseFromString(html, 'text/html')

  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const W = 595, H = 842, M = 64
  let page = pdf.addPage([W, H])
  let y = H - M

  const write = (text: string, size: number, font: typeof regular, indent = 0, gap = 8) => {
    const lh = size * 1.35
    const words = safe(text).split(/\s+/).filter(Boolean)
    let line = ''
    const emit = (l: string) => {
      if (y - lh < M) { page = pdf.addPage([W, H]); y = H - M }
      page.drawText(l, { x: M + indent, y: y - size, size, font, color: rgb(0.1, 0.1, 0.1) })
      y -= lh
    }
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (font.widthOfTextAtSize(test, size) > W - 2 * M - indent && line) { emit(line); line = w } else line = test
    }
    if (line) emit(line)
    y -= gap
  }

  for (const el of Array.from(dom.body.children)) {
    const tag = el.tagName.toLowerCase()
    if (/^h[1-6]$/.test(tag)) {
      const size = [22, 18, 15, 13, 12, 12][Number(tag[1]) - 1]
      write(el.textContent || '', size, bold, 0, 10)
    } else if (tag === 'ul' || tag === 'ol') {
      Array.from(el.querySelectorAll('li')).forEach((li, i) =>
        write(`${tag === 'ol' ? i + 1 + '.' : '-'} ${li.textContent || ''}`, 11.5, regular, 14, 4),
      )
      y -= 4
    } else if (el.textContent?.trim()) {
      write(el.textContent, 11.5, regular)
    }
  }
  return pdf.save()
}
