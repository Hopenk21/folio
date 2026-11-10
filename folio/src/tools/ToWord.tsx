import { useState } from 'react'
import { pdfToDocx } from '../engine/convert'
import { saveFile } from '../platform'
import { Drop, Button, Note, Picked, ToolProps, baseName, useTask , useIncoming , FileCard } from '../ui'

export default function ToWord(props: ToolProps) {
  const { notify } = props
  const [file, setFile] = useState<Picked | null>(null)
  const [busy, run] = useTask(notify)
  const go = () => run(async () => {
    const out = await pdfToDocx(file!.bytes)
    if (await saveFile(`${baseName(file!.name)}.docx`, out)) notify('Converted to Word')
  })

  useIncoming(props, (f) => setFile(f[0]))

  if (!file) return <Drop accept="application/pdf,.pdf" label="Choose a PDF" hint="Convert to an editable .docx" onFiles={([f]) => setFile(f)} />
  return (
    <>
      <FileCard file={file} />
      <Note>Text is extracted and rebuilt into paragraphs and headings. Tables, columns, images and scanned pages are not carried over, so expect to tidy the result.</Note>
      <div className="actions">
        <Button variant="quiet" onClick={() => setFile(null)}>Choose another</Button>
        <Button onClick={go} busy={busy}>Convert to Word</Button>
      </div>
    </>
  )
}
