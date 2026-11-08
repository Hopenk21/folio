import { useState } from 'react'
import { RotateCw, Trash2 } from 'lucide-react'
import { organize, pageCount } from '../engine/pdf'
import { renderThumbs } from '../engine/render'
import { saveFile } from '../platform'
import { moveItem, useDragReorder } from '../drag'
import { Drop, Button, Note, Picked, ToolProps, baseName, useTask , useIncoming } from '../ui'

interface Pg { index: number; rotate: number; thumb?: string }

export default function Organize(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [pages, setPages] = useState<Pg[]>([])
  const [busy, run] = useTask(notify)
  const drag = useDragReorder((from, to) => setPages((cur) => moveItem(cur, from, to)))

  const open = async ([f]: Picked[]) => {
    try {
      const n = await pageCount(f.bytes)
      setFile(f)
      setPages(Array.from({ length: n }, (_, i) => ({ index: i, rotate: 0 })))
      await renderThumbs(f.bytes, (i, url) => setPages((cur) => cur.map((p) => (p.index === i ? { ...p, thumb: url } : p))))
    } catch {
      notify('That file could not be read as a PDF', 'error')
      setFile(null)
      setPages([])
    }
  }
  const rotate = (i: number) => setPages(pages.map((p, k) => (k === i ? { ...p, rotate: (p.rotate + 90) % 360 } : p)))
  const save = () => run(async () => {
    const out = await organize(file!.bytes, pages.map((p) => ({ index: p.index, rotate: p.rotate })))
    if (await saveFile(`${baseName(file!.name)}-organized.pdf`, out)) notify('Saved')
  })

  useIncoming(props, (f) => { open(f) })

  return (
    <>
      {!file && <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Drag pages into the order you want" onFiles={open} />}
      {file && (
        <>
          <Note>Touch and hold any page, then drag it to where it should go. The page under your finger is highlighted, and it drops there when you let go.</Note>
          <div className="grid" ref={drag.ref}>
            {pages.map((p, i) => (
              <div
                className={'thumb' + (drag.state?.from === i ? ' dragging' : '') + (drag.state && drag.state.to === i && drag.state.to !== drag.state.from ? ' drop-target' : '')}
                key={p.index}
                {...drag.bind(i)}
              >
                <div className="thumb-img">
                  {p.thumb
                    ? <img src={p.thumb} alt={`Page ${i + 1}`} draggable={false} style={{ transform: `rotate(${p.rotate}deg)` }} />
                    : <span className="thumb-wait" />}
                </div>
                <div className="thumb-bar">
                  <span className="thumb-num">{i + 1}</span>
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
