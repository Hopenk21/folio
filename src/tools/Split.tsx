import { useState } from 'react'
import JSZip from 'jszip'
import { extractPages, pageCount, parseRanges, splitEvery } from '../engine/pdf'
import { saveFile } from '../platform'
import { Drop, Button, Field, Picked, ToolProps, baseName, useTask , useIncoming , FileCard } from '../ui'

export default function Split(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [total, setTotal] = useState(0)
  const [mode, setMode] = useState<'ranges' | 'every'>('ranges')
  const [ranges, setRanges] = useState('')
  const [every, setEvery] = useState(1)
  const [busy, run] = useTask(notify)

  const open = async ([f]: Picked[]) => {
    try { setTotal(await pageCount(f.bytes)); setFile(f) } catch { notify('That file could not be read as a PDF', 'error') }
  }
  const go = () => run(async () => {
    const name = baseName(file!.name)
    if (mode === 'ranges') {
      const out = await extractPages(file!.bytes, parseRanges(ranges, total))
      if (await saveFile(`${name}-extract.pdf`, out)) notify('Saved')
    } else {
      const parts = await splitEvery(file!.bytes, Math.max(1, every))
      const zip = new JSZip()
      parts.forEach((p, i) => zip.file(`${name}-${String(i + 1).padStart(2, '0')}.pdf`, p))
      if (await saveFile(`${name}-split.zip`, await zip.generateAsync({ type: 'uint8array' }))) notify(`Saved ${parts.length} files in a zip`)
    }
  })

  useIncoming(props, (f) => { open(f) })

  if (!file) return <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Extract pages or split into parts" onFiles={open} />
  return (
    <>
      <FileCard file={file} sub={`${total} pages`} />
      <div className="seg" role="tablist">
        <button className={mode === 'ranges' ? 'on' : ''} onClick={() => setMode('ranges')}>Extract pages</button>
        <button className={mode === 'every' ? 'on' : ''} onClick={() => setMode('every')}>Split every N pages</button>
      </div>
      {mode === 'ranges'
        ? <Field label="Pages" note={`Example: 1-3, 5, 8-10 (document has ${total})`}><input className="input" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5" /></Field>
        : <Field label="Pages per file" note="Files are bundled into one zip"><input className="input" type="number" min={1} max={total} value={every} onChange={(e) => setEvery(+e.target.value)} /></Field>}
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button onClick={go} busy={busy} disabled={mode === 'ranges' && !ranges.trim()}>{mode === 'ranges' ? 'Extract' : 'Split'}</Button>
      </div>
    </>
  )
}
