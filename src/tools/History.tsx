import { useEffect, useRef, useState } from 'react'
import { ChevronRight, History as HistoryIcon, Trash2 } from 'lucide-react'
import { histClear, histDelete, histList, histRead, histTouch, type HistEntry } from '../platform'
import { fmtSize, ToolProps } from '../ui'

const PDF_TOOLS: [string, string][] = [['merge', 'Merge'], ['organize', 'Organize'], ['split', 'Split'], ['stamp', 'Stamp'], ['optimize', 'Optimize'], ['toword', 'To Word']]
const DOCX_TOOLS: [string, string][] = [['topdf', 'To PDF']]
const TOOL_LABEL: Record<string, string> = Object.fromEntries([...PDF_TOOLS, ...DOCX_TOOLS])
const extOf = (n: string) => (n.split('.').pop() || '').toLowerCase()

function when(ms: number) {
  const d = new Date(ms)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  const t = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (days === 0) return `Today, ${t}`
  if (days === 1) return `Yesterday, ${t}`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function History({ notify, openIn }: ToolProps) {
  const [items, setItems] = useState<HistEntry[]>(histList)
  const [open, setOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const ask = (key: string, then: () => Promise<void>) => {
    if (confirm !== key) {
      setConfirm(key)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setConfirm(null), 3000)
      return
    }
    setConfirm(null)
    then().then(() => setItems(histList()))
  }

  const reopen = async (e: HistEntry, toolId: string) => {
    try {
      const bytes = await histRead(e.id)
      histTouch(e.id, toolId)
      openIn?.(toolId, [{ name: e.name, bytes }])
    } catch {
      notify('That file is no longer stored. It may have been cleared.', 'error')
      await histDelete(e.id)
      setItems(histList())
    }
  }

  if (!items.length)
    return (
      <div className="empty">
        <span className="drop-icon"><HistoryIcon size={22} strokeWidth={1.6} /></span>
        <p className="empty-title">No history yet</p>
        <p className="row-sub">Documents you open in Folio show up here, so you can pick up where you left off.</p>
      </div>
    )

  return (
    <>
      <div className="hist-head">
        <p className="note" style={{ flex: 1 }}>Copies of documents you opened are kept on this device. Tap one to reopen it in a tool.</p>
        <button className={'btn quiet' + (confirm === 'all' ? ' dangerous' : '')} onClick={() => ask('all', histClear)}>{confirm === 'all' ? 'Tap again to clear' : 'Clear history'}</button>
      </div>
      <ul className="list">
        {items.map((e) => {
          const tools = extOf(e.name) === 'docx' ? DOCX_TOOLS : PDF_TOOLS
          return (
            <li className="row wrap" key={e.id}>
              <button className="row-tap" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                <span className={'badge ' + extOf(e.name)}>{extOf(e.name).toUpperCase() || 'FILE'}</span>
                <span className="row-main">
                  <span className="row-title">{e.name}</span>
                  <span className="row-sub">{when(e.time)} · {fmtSize(e.size)}{TOOL_LABEL[e.tool] ? ` · ${TOOL_LABEL[e.tool]}` : ''}</span>
                </span>
                <ChevronRight size={16} className={'chev' + (open === e.id ? ' turned' : '')} />
              </button>
              <button className={'icon' + (confirm === e.id ? ' danger' : '')} aria-label={confirm === e.id ? 'Tap again to remove' : 'Remove from history'} onClick={() => ask(e.id, () => histDelete(e.id))}>
                {confirm === e.id ? <span className="sure">Remove?</span> : <Trash2 size={16} />}
              </button>
              {open === e.id && (
                <div className="row-open">
                  <span className="row-sub">Open in</span>
                  {tools.map(([id, label]) => <button key={id} className="chip" onClick={() => reopen(e, id)}>{label}</button>)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
