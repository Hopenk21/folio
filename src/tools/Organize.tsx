import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, Trash2 } from 'lucide-react'
import { organize } from '../engine/pdf'
import { renderThumbs } from '../engine/render'
import { saveFile } from '../platform'
import { Drop, Button, Picked, ToolProps, baseName, useTask } from '../ui'

interface Pg { index: number; rotate: number; thumb?: string }

export default function Organize({ notify }: ToolProps) {
  const [file, setFile] = useState<Picked | null>(null)
  const [pages, setPages] = useState<Pg[]>([])
  const [busy, run] = useTask(notify)

  const open = async ([f]: Picked[]) => {
    try {
      setFile(f)
      await renderThumbs(f.bytes, (i, url) =>
        setPages((cur) => {
          const next = cur.length ? cur.slice() : []
          next[i] = { index: i, rotate: 0, thumb: url }
          return next
        }))
    } catch { notify('That file could not be read as a PDF', 'error'); setFile(null); setPages([]) }
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= pages.length) return
    const next = pages.slice();[next[i], next[j]] = [next[j], next[i]]
    setPages(next)
  }
  const rotate = (i: number) => setPages(pages.map((p, k) => (k === i ? { ...p, rotate: (p.rotate + 90) % 360 } : p)))
  const save = () => run(async () => {
    const out = await organize(file!.bytes, pages.map((p) => ({ index: p.index, rotate: p.rotate })))
    if (await saveFile(`${baseName(file!.name)}-organized.pdf`, out)) notify('Saved')
  })

  return (
    <>
      {!file && <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Reorder, rotate or delete its pages" onFiles={open} />}
      {file && (
        <>
          <div className="grid">
            {pages.filter(Boolean).map((p, i) => (
              <div className="thumb" key={p.index}>
                <div className="thumb-img"><img src={p.thumb} alt={`Page ${p.index + 1}`} style={{ transform: `rotate(${p.rotate}deg)` }} /></div>
                <div className="thumb-bar">
                  <span className="thumb-num">{p.index + 1}</span>
                  <button className="icon" aria-label="Move earlier" onClick={() => move(i, -1)}><ArrowLeft size={14} /></button>
                  <button className="icon" aria-label="Move later" onClick={() => move(i, 1)}><ArrowRight size={14} /></button>
                  <button className="icon" aria-label="Rotate" onClick={() => rotate(i)}><RotateCw size={14} /></button>
                  <button className="icon" aria-label="Delete page" onClick={() => setPages(pages.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="actions">
            <Button variant="quiet" onClick={() => { setFile(null); setPages([]) }}>Choose another</Button>
            <Button onClick={save} busy={busy} disabled={!pages.length}>Save PDF</Button>
          </div>
        </>
      )}
    </>
  )
}
