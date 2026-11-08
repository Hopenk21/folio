import { useState } from 'react'
import { addPageNumbers, watermark } from '../engine/pdf'
import { saveFile } from '../platform'
import { Drop, Button, Field, Picked, ToolProps, baseName, useTask , useIncoming } from '../ui'

export default function Stamp(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(0.18)
  const [useMark, setUseMark] = useState(true)
  const [numbers, setNumbers] = useState(false)
  const [busy, run] = useTask(notify)

  const go = () => run(async () => {
    let out = file!.bytes
    if (useMark && text.trim()) out = await watermark(out, text.trim(), opacity)
    if (numbers) out = await addPageNumbers(out)
    if (await saveFile(`${baseName(file!.name)}-stamped.pdf`, out)) notify('Saved')
  })

  useIncoming(props, (f) => setFile(f[0]))

  if (!file) return <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Add a watermark or page numbers" onFiles={([f]) => setFile(f)} />
  return (
    <>
      <div className="card"><p className="row-title">{file.name}</p></div>
      <label className="check"><input type="checkbox" checked={useMark} onChange={(e) => setUseMark(e.target.checked)} /> Diagonal watermark</label>
      {useMark && (
        <>
          <Field label="Watermark text" note="Latin characters only"><input className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <Field label={`Opacity ${Math.round(opacity * 100)}%`}><input type="range" min={0.05} max={0.6} step={0.01} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></Field>
        </>
      )}
      <label className="check"><input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Page numbers (bottom centre)</label>
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button onClick={go} busy={busy} disabled={!useMark && !numbers}>Apply and save</Button>
      </div>
    </>
  )
}
