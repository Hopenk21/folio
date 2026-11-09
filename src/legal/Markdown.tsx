import type { ReactNode } from 'react'
import { CONTACT_EMAIL } from '../config'

const inline = (s: string): ReactNode[] =>
  s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )

/** Renders the small subset of markdown the legal documents use: headings, paragraphs, bullets, bold. */
export default function Markdown({ text }: { text: string }) {
  const lines = text.split('{{EMAIL}}').join(CONTACT_EMAIL).split('\n')
  const out: ReactNode[] = []
  let list: string[] = []
  let afterTitle = false

  const flush = () => {
    if (!list.length) return
    out.push(<ul key={out.length}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>)
    list = []
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue }
    flush()
    if (!line) continue
    if (line.startsWith('## ')) { out.push(<h2 key={out.length}>{line.slice(3)}</h2>); afterTitle = false }
    else if (line.startsWith('# ')) { out.push(<h1 key={out.length}>{line.slice(2)}</h1>); afterTitle = true }
    else { out.push(<p key={out.length} className={afterTitle ? 'meta' : undefined}>{inline(line)}</p>); afterTitle = false }
  }
  flush()
  return <article className="prose">{out}</article>
}
