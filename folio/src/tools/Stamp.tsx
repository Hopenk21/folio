import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addPageNumbers, watermark } from '../engine/pdf'
import { loadPdf } from '../engine/render'
import { saveFile } from '../platform'
import { Drop, Button, Field, FileCard, Picked, ToolProps, baseName, useIncoming, useTask, useViewer } from '../ui'

// Same Latin-only rule the stamping engine applies, so the preview matches the result.
const latin = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

function Preview({ bytes, text, opacity, mark, numbers }: { bytes: Uint8Array; text: string; opacity: number; mark: boolean; numbers: boolean }) {
  const [doc, setDoc] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [dim, setDim] = useState({ w: 595, h: 842 })
  const [px, setPx] = useState(320)
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    loadPdf(bytes).then((d: any) => { if (alive) { setDoc(d); setPage(1) } }).catch(() => {})
    return () => { alive = false }
  }, [bytes])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setPx(Math.min(360, Math.max(200, el.clientWidth - 28))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    let task: any
    ;(async () => {
      const p = await doc.getPage(page)
      const base = p.getViewport({ scale: 1 })
      if (cancelled) return
      setDim({ w: base.width, h: base.height })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = p.getViewport({ scale: (px / base.width) * dpr })
      const c = canvas.current
      if (!c) return
      c.width = vp.width
      c.height = vp.height
      c.style.width = px + 'px'
      c.style.height = vp.height / dpr + 'px'
      task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp })
      await task.promise.catch(() => {})
    })()
    return () => { cancelled = true; task?.cancel?.() }
  }, [doc, page, px])

  const k = px / dim.w
  const total = doc?.numPages ?? 1
  return (
    <div className="stamp-preview" ref={box}>
      <div className="stamp-page" style={{ width: px, height: dim.h * k }}>
        <canvas ref={canvas} />
        {mark && text.trim() && <div className="wm" style={{ fontSize: (Math.min(dim.w, dim.h) / 7) * k, opacity }}>{latin(text.trim())}</div>}
        {numbers && <div className="pn" style={{ fontSize: 10 * k, bottom: 18 * k }}>{page} / {total}</div>}
      </div>
      <div className="pager">
        <button className="icon" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={16} /></button>
        <span>Page {page} of {total}</span>
        <button className="icon" aria-label="Next page" onClick={() => setPage((p) => Math.min(total, p + 1))} disabled={page >= total}><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

export default function Stamp(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(0.18)
  const [useMark, setUseMark] = useState(true)
  const [numbers, setNumbers] = useState(false)
  const [busy, run] = useTask(notify)
  const view = useViewer()

  const build = async () => {
    let out = file!.bytes
    if (useMark && text.trim()) out = await watermark(out, text.trim(), opacity)
    if (numbers) out = await addPageNumbers(out)
    return out
  }
  const go = () => run(async () => {
    const out = await build()
    if (await saveFile(`${baseName(file!.name)}-stamped.pdf`, out)) notify('Saved')
  })
  const preview = () => run(async () => { view(`${baseName(file!.name)} (preview)`, await build()) })

  useIncoming(props, (f) => setFile(f[0]))

  if (!file) return <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Add a watermark or page numbers" onFiles={([f]) => setFile(f)} />
  return (
    <>
      <FileCard file={file} />
      <div className="stamp-layout">
        <Preview bytes={file.bytes} text={text} opacity={opacity} mark={useMark} numbers={numbers} />
        <div className="stamp-controls">
          <label className="check"><input type="checkbox" checked={useMark} onChange={(e) => setUseMark(e.target.checked)} /> Diagonal watermark</label>
          {useMark && (
            <>
              <Field label="Watermark text" note="Latin characters only"><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field>
              <Field label={`Opacity ${Math.round(opacity * 100)}%`}><input type="range" min={0.05} max={0.6} step={0.01} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></Field>
            </>
          )}
          <label className="check"><input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Page numbers (bottom centre)</label>
        </div>
      </div>
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button variant="quiet" onClick={preview} busy={busy} disabled={!useMark && !numbers}>Preview result</Button>
        <Button onClick={go} busy={busy} disabled={!useMark && !numbers}>Apply and save</Button>
      </div>
    </>
  )
}
