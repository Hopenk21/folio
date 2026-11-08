// The legacy build runs on older Android WebView versions that the modern build breaks on.
// @ts-ignore - no bundled types for the legacy entry point
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
// @ts-ignore
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// pdf.js takes ownership of the buffer it is given, so always hand it a copy.
export const loadPdf = (bytes: Uint8Array) => pdfjs.getDocument({ data: bytes.slice() }).promise

export async function renderThumbs(
  bytes: Uint8Array,
  onThumb: (index: number, url: string) => void,
  width = 180,
) {
  const doc = await loadPdf(bytes)
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    onThumb(i - 1, canvas.toDataURL('image/jpeg', 0.7))
  }
}
