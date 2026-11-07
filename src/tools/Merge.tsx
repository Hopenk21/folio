import { useRef, useState } from 'react'
import { ChevronUp, ChevronDown, GripVertical, X } from 'lucide-react'
import { mergePdfs, pageCount } from '../engine/pdf'
import { saveFile } from '../platform'
import { Drop, Button, Item, Picked, ToolProps, fmtSize, nid, useTask } from '../ui'

export default function Merge({ notify }: ToolProps) {
  const [items, setItems] = useState<Item[]>([])
  const [busy, run] = useTask(notify)
  const dragFrom = useRef<number | null>(null)

  const add = async (files: Picked[]) => {
    const next: Item[] = []
    for (const f of files) {
      try { next.push({ ...f, id: nid(), pages: await pageCount(f.bytes) }) }
      catch { notify(`${f.name} could not be read as a PDF`, 'error') }
    }
    setItems((cur) => [...cur, ...next])
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = items.slice()
    next.splice(to, 0, next.splice(from, 1)[0])
    setItems(next)
  }
  const merge = () => run(async () => {
    const out = await mergePdfs(items.map((i) => i.bytes))
    if (await saveFile('merged.pdf', out)) notify(`Merged ${items.length} files`)
  })

  return (
    <>
      <Drop accept="application/pdf,.pdf" multiple label="Add PDF files" hint="Drop here or browse" onFiles={add} />
      {items.length > 0 && (
        <ul className="list">
          {items.map((it, i) => (
            <li key={it.id} className="row" draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null }}>
              <GripVertical size={16} className="grip" />
              <span className="badge">PDF</span>
              <div className="row-main">
                <span className="row-title">{it.name}</span>
                <span className="row-sub">{it.pages} pages · {fmtSize(it.bytes.length)}</span>
              </div>
              <button className="icon" aria-label="Move up" onClick={() => move(i, i - 1)}><ChevronUp size={16} /></button>
              <button className="icon" aria-label="Move down" onClick={() => move(i, i + 1)}><ChevronDown size={16} /></button>
              <button className="icon" aria-label="Remove" onClick={() => setItems(items.filter((x) => x.id !== it.id))}><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions"><Button onClick={merge} busy={busy} disabled={items.length < 2}>Merge {items.length > 1 ? `${items.length} files` : ''}</Button></div>
    </>
  )
}
