import { useState } from 'react'
import { ChevronUp, ChevronDown, Eye, GripVertical, X } from 'lucide-react'
import { mergePdfs, pageCount } from '../engine/pdf'
import { saveFile } from '../platform'
import { moveItem, useDragReorder } from '../drag'
import { Drop, Button, Item, Note, Picked, ToolProps, fmtSize, nid, useTask , useIncoming , useViewer } from '../ui'

export default function Merge(props: ToolProps) {
  const { notify } = props
  const view = useViewer()
  const [items, setItems] = useState<Item[]>([])
  const [busy, run] = useTask(notify)
  const drag = useDragReorder((from, to) => setItems((cur) => moveItem(cur, from, to)))

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
    setItems(moveItem(items, from, to))
  }
  const merge = () => run(async () => {
    const out = await mergePdfs(items.map((i) => i.bytes))
    if (await saveFile('merged.pdf', out)) notify(`Merged ${items.length} files`)
  })

  useIncoming(props, (f) => { add(f) })

  return (
    <>
      <Drop accept="application/pdf,.pdf" multiple label="Add PDF files" hint="Drop here or browse" onFiles={add} />
      {items.length > 1 && <Note>Touch and hold a file, then drag it into place.</Note>}
      {items.length > 0 && (
        <ul className="list" ref={drag.ref}>
          {items.map((it, i) => (
            <li
              key={it.id}
              {...drag.bind(i)}
              className={'row' + (drag.state?.from === i ? ' dragging' : '') + (drag.state && drag.state.to === i && drag.state.to !== drag.state.from ? ' drop-target' : '')}
            >
              <GripVertical size={16} className="grip" />
              <span className="badge">PDF</span>
              <div className="row-main">
                <span className="row-title">{it.name}</span>
                <span className="row-sub">{it.pages} pages · {fmtSize(it.bytes.length)}</span>
              </div>
              <button className="icon" aria-label={`Preview ${it.name}`} onClick={() => view(it.name, it.bytes)}><Eye size={16} /></button>
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
