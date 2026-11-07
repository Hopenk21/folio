import { useState } from 'react'
import { optimize } from '../engine/pdf'
import { saveFile } from '../platform'
import { Drop, Button, Note, Picked, ToolProps, baseName, fmtSize, useTask } from '../ui'

export default function Optimize({ notify }: ToolProps) {
  const [file, setFile] = useState<Picked | null>(null)
  const [busy, run] = useTask(notify)

  const go = () => run(async () => {
    const out = await optimize(file!.bytes)
    const saved = file!.bytes.length - out.length
    if (await saveFile(`${baseName(file!.name)}-optimized.pdf`, out))
      notify(saved > 0 ? `Saved. ${fmtSize(file!.bytes.length)} → ${fmtSize(out.length)}` : 'Saved. This file was already compact')
  })

  if (!file) return <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Tidy structure and strip metadata" onFiles={([f]) => setFile(f)} />
  return (
    <>
      <div className="card"><p className="row-title">{file.name}</p><p className="row-sub">{fmtSize(file.bytes.length)}</p></div>
      <Note>This is a lossless clean-up: it repacks the file structure and removes author and title metadata. It does not recompress images, so scan-heavy PDFs may barely shrink.</Note>
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button onClick={go} busy={busy}>Optimize and save</Button>
      </div>
    </>
  )
}
