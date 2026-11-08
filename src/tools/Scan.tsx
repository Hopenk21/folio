import { useCallback, useEffect, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import { imagesToPdf } from '../engine/pdf'
import { draftLoad, draftSync, newId, saveFile, scanPages } from '../platform'
import { moveItem, useDragReorder } from '../drag'
import { Button, Note, ToolProps, useTask } from '../ui'

interface Page { id: string; url: string; bytes: Uint8Array; type: 'png' | 'jpg' }
const urlFor = (bytes: Uint8Array, type: 'png' | 'jpg') =>
  URL.createObjectURL(new Blob([bytes as BlobPart], { type: type === 'png' ? 'image/png' : 'image/jpeg' }))

export default function Scan({ notify }: ToolProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [ready, setReady] = useState(false)
  const [busy, run] = useTask(notify)
  const drag = useDragReorder((from, to) => setPages((cur) => moveItem(cur, from, to)))

  // Pages scanned earlier (or while the app was restarted) come back from disk.
  const restore = useCallback(async () => {
    const saved = await draftLoad()
    setPages(saved.map((s) => ({ ...s, url: urlFor(s.bytes, s.type) })))
    setReady(true)
  }, [])
  useEffect(() => {
    restore()
    window.addEventListener('folio:scan-restored', restore)
    return () => window.removeEventListener('folio:scan-restored', restore)
  }, [restore])

  // Keep the current pages on disk so a restart never loses them.
  useEffect(() => {
    if (ready) draftSync(pages.map(({ id, bytes, type }) => ({ id, bytes, type })))
  }, [pages, ready])

  const scan = () => run(async () => {
    const got = await scanPages()
    setPages((cur) => [...cur, ...got.map((g) => ({ ...g, id: newId(), url: urlFor(g.bytes, g.type) }))])
  })
  const save = () => run(async () => {
    const out = await imagesToPdf(pages.map((p) => ({ bytes: p.bytes, type: p.type })))
    const stamp = new Date().toISOString().slice(0, 10)
    if (await saveFile(`scan-${stamp}.pdf`, out)) {
      notify('Saved')
      setPages([]) // clears the draft too
    }
  })

  return (
    <>
      <div className="actions start"><Button onClick={scan} busy={busy}>{pages.length ? 'Scan more pages' : 'Start scanning'}</Button></div>
      {pages.length > 0 && (
        <>
          <Note>Your scans are kept safely on this device until you save them as a PDF.</Note>
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
          <div className="actions">
            <Button variant="quiet" onClick={() => setPages([])}>Discard all</Button>
            <Button onClick={save} busy={busy}>Save {pages.length} {pages.length === 1 ? 'page' : 'pages'} as PDF</Button>
          </div>
        </>
      )}
    </>
  )
}
