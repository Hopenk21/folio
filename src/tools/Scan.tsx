import { useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { imagesToPdf } from '../engine/pdf'
import { saveFile, scanPages } from '../platform'
import { moveItem, useDragReorder } from '../drag'
import { Button, ToolProps, nid, useTask } from '../ui'

interface Page { id: string; url: string; bytes: Uint8Array; type: 'png' | 'jpg' }

export default function Scan({ notify }: ToolProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [busy, run] = useTask(notify)
  const drag = useDragReorder((from, to) => setPages((cur) => moveItem(cur, from, to)))

  const scan = () => run(async () => {
    const got = await scanPages()
    setPages((cur) => [...cur, ...got.map((g) => ({
      ...g, id: nid(), url: URL.createObjectURL(new Blob([g.bytes as BlobPart], { type: g.type === 'png' ? 'image/png' : 'image/jpeg' })),
    }))])
  })
  const save = () => run(async () => {
    const out = await imagesToPdf(pages.map((p) => ({ bytes: p.bytes, type: p.type })))
    const stamp = new Date().toISOString().slice(0, 10)
    if (await saveFile(`scan-${stamp}.pdf`, out)) notify('Saved')
  })

  return (
    <>
      <div className="actions start"><Button onClick={scan} busy={busy}>{pages.length ? 'Scan more pages' : 'Start scanning'}</Button></div>
      {pages.length > 0 && (
        <>
          <div className="grid" ref={drag.ref}>
            {pages.map((p, i) => (
              <div
                className={'thumb' + (drag.state?.from === i ? ' dragging' : '') + (drag.state && drag.state.to === i && drag.state.to !== drag.state.from ? ' drop-target' : '')}
                key={p.id}
              >
                <div className="thumb-img" onPointerDown={(e) => { if (e.pointerType === 'mouse') drag.start(e, i) }}>
                  <img src={p.url} alt={`Scan ${i + 1}`} draggable={false} />
                </div>
                <div className="thumb-bar">
                  <button className="icon handle" aria-label={`Drag scan ${i + 1} to reorder`} onPointerDown={(e) => drag.start(e, i)}><GripVertical size={16} /></button>
                  <span className="thumb-num">{i + 1}</span>
                  <button className="icon" aria-label="Delete" onClick={() => setPages(pages.filter((x) => x.id !== p.id))}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="actions"><Button onClick={save} busy={busy}>Save {pages.length} {pages.length === 1 ? 'page' : 'pages'} as PDF</Button></div>
        </>
      )}
    </>
  )
}
