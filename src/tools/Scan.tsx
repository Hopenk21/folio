import { useState } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { imagesToPdf } from '../engine/pdf'
import { saveFile, scanPages } from '../platform'
import { Button, ToolProps, nid, useTask } from '../ui'

interface Page { id: string; url: string; bytes: Uint8Array; type: 'png' | 'jpg' }

export default function Scan({ notify }: ToolProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [busy, run] = useTask(notify)

  const scan = () => run(async () => {
    const got = await scanPages()
    setPages((cur) => [...cur, ...got.map((g) => ({
      ...g, id: nid(), url: URL.createObjectURL(new Blob([g.bytes as BlobPart], { type: g.type === 'png' ? 'image/png' : 'image/jpeg' })),
    }))])
  })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= pages.length) return
    const next = pages.slice();[next[i], next[j]] = [next[j], next[i]]
    setPages(next)
  }
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
          <div className="grid">
            {pages.map((p, i) => (
              <div className="thumb" key={p.id}>
                <div className="thumb-img"><img src={p.url} alt={`Scan ${i + 1}`} /></div>
                <div className="thumb-bar">
                  <span className="thumb-num">{i + 1}</span>
                  <button className="icon" aria-label="Move earlier" onClick={() => move(i, -1)}><ChevronUp size={14} /></button>
                  <button className="icon" aria-label="Move later" onClick={() => move(i, 1)}><ChevronDown size={14} /></button>
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
