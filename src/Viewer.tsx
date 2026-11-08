import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { loadPdf } from './engine/render'

function PageView({ doc, n, width, ratio }: { doc: any; n: number; width: number; ratio: number }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [h, setH] = useState(width * ratio)

  useEffect(() => { setH(width * ratio) }, [width, ratio])

  // Only pages near the screen are drawn; far-away pages are released to save memory.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '900px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!visible || !width) {
      if (c) { c.width = 0; c.height = 0 }
      return
    }
    let cancelled = false
    let task: any
    ;(async () => {
      const page = await doc.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = page.getViewport({ scale: (width / base.width) * dpr })
      if (!c || cancelled) return
      c.width = vp.width
      c.height = vp.height
      c.style.width = width + 'px'
      c.style.height = vp.height / dpr + 'px'
      setH(vp.height / dpr)
      task = page.render({ canvasContext: c.getContext('2d')!, viewport: vp })
      await task.promise.catch(() => {})
    })()
    return () => { cancelled = true; task?.cancel?.() }
  }, [visible, width, doc, n])

  return (
    <div ref={host} className="vpage" data-page={n} style={{ width, height: h }}>
      <canvas ref={canvas} />
    </div>
  )
}

/** Full-screen PDF reader: scroll through pages, zoom, close. */
export default function Viewer({ name, bytes, onClose }: { name: string; bytes: Uint8Array; onClose: () => void }) {
  const [doc, setDoc] = useState<any>(null)
  const [error, setError] = useState('')
  const [ratio, setRatio] = useState(1.414)
  const [zoom, setZoom] = useState(1)
  const [boxW, setBoxW] = useState(0)
  const [cur, setCur] = useState(1)
  const scroller = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  useEffect(() => {
    let alive = true
    setDoc(null)
    setError('')
    loadPdf(bytes)
      .then(async (d: any) => {
        const p = await d.getPage(1)
        const v = p.getViewport({ scale: 1 })
        if (!alive) return
        setRatio(v.height / v.width)
        setDoc(d)
      })
      .catch(() => alive && setError('This PDF could not be opened.'))
    return () => { alive = false }
  }, [bytes])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onScroll = () => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const el = scroller.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      for (const p of Array.from(el.querySelectorAll<HTMLElement>('.vpage'))) {
        if (p.getBoundingClientRect().bottom > top + 80) { setCur(Number(p.dataset.page)); break }
      }
    })
  }

  const pageW = Math.max(0, Math.min(boxW - 24, 900)) * zoom
  const total = doc?.numPages ?? 0
  const step = (d: number) => setZoom((z) => Math.min(3, Math.max(0.5, Math.round((z + d) * 4) / 4)))

  return (
    <div className="viewer" role="dialog" aria-label={`Viewing ${name}`}>
      <div className="viewer-bar">
        <button className="icon" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <span className="viewer-title">{name}</span>
        {total > 0 && <span className="viewer-meta">{cur} / {total}</span>}
        <button className="icon" aria-label="Zoom out" onClick={() => step(-0.25)} disabled={zoom <= 0.5}><ZoomOut size={18} /></button>
        <button className="icon" aria-label="Zoom in" onClick={() => step(0.25)} disabled={zoom >= 3}><ZoomIn size={18} /></button>
      </div>
      <div className="viewer-scroll" ref={scroller} onScroll={onScroll}>
        {error && <p className="viewer-msg">{error}</p>}
        {!doc && !error && <p className="viewer-msg">Opening…</p>}
        {doc && (
          <div className="viewer-pages">
            {Array.from({ length: total }, (_, i) => <PageView key={i} doc={doc} n={i + 1} width={pageW} ratio={ratio} />)}
          </div>
        )}
      </div>
    </div>
  )
}
