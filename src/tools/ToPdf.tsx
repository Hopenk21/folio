import { useState } from 'react'
import { docxToPdf } from '../engine/convert'
import { saveFile } from '../platform'
import { Drop, Button, Note, Picked, ToolProps, baseName, useTask , useIncoming } from '../ui'

export default function ToPdf(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [busy, run] = useTask(notify)
  const go = () => run(async () => {
    const out = await docxToPdf(file!.bytes)
    if (await saveFile(`${baseName(file!.name)}.pdf`, out)) notify('Converted to PDF')
  })

  useIncoming(props, (f) => setFile(f[0]))

  if (!file) return <Drop accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" label="Choose a Word file" hint=".docx only" onFiles={([f]) => setFile(f)} />
  return (
    <>
      <div className="card"><p className="row-title">{file.name}</p></div>
      <Note>Headings, paragraphs and lists are laid out in a clean serif style. The original fonts, tables, images and page layout are not preserved. For exact fidelity, use Word's own Save as PDF.</Note>
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button onClick={go} busy={busy}>Convert to PDF</Button>
      </div>
    </>
  )
}
