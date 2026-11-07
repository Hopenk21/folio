import { useCallback, useRef, useState, type ComponentType } from 'react'
import { Combine, FileOutput, FileText, LayoutGrid, Minimize2, ScanLine, Scissors, Stamp as StampIcon } from 'lucide-react'
import { isAndroid } from './platform'
import type { Notify, ToolProps } from './ui'
import Merge from './tools/Merge'
import Organize from './tools/Organize'
import Split from './tools/Split'
import Stamp from './tools/Stamp'
import Optimize from './tools/Optimize'
import ToWord from './tools/ToWord'
import ToPdf from './tools/ToPdf'
import Scan from './tools/Scan'

interface Tool { id: string; label: string; title: string; desc: string; icon: typeof Combine; View: ComponentType<ToolProps>; androidOnly?: boolean }

const TOOLS: Tool[] = [
  { id: 'merge', label: 'Merge', title: 'Merge PDFs', desc: 'Combine several PDFs into one document, in the order you choose.', icon: Combine, View: Merge },
  { id: 'organize', label: 'Organize', title: 'Organize pages', desc: 'Reorder, rotate and delete pages in a PDF.', icon: LayoutGrid, View: Organize },
  { id: 'split', label: 'Split', title: 'Split or extract', desc: 'Pull out page ranges, or cut a PDF into equal parts.', icon: Scissors, View: Split },
  { id: 'stamp', label: 'Stamp', title: 'Watermark and numbers', desc: 'Add a watermark or page numbers to every page.', icon: StampIcon, View: Stamp },
  { id: 'optimize', label: 'Optimize', title: 'Optimize', desc: 'Clean up file structure and remove metadata.', icon: Minimize2, View: Optimize },
  { id: 'toword', label: 'To Word', title: 'PDF to Word', desc: 'Turn a text PDF into an editable Word document.', icon: FileText, View: ToWord },
  { id: 'topdf', label: 'To PDF', title: 'Word to PDF', desc: 'Turn a Word document into a PDF.', icon: FileOutput, View: ToPdf },
  { id: 'scan', label: 'Scan', title: 'Scan documents', desc: 'Use your camera to capture pages and save them as a PDF.', icon: ScanLine, View: Scan, androidOnly: true },
]

export default function App() {
  const tools = TOOLS.filter((t) => !t.androidOnly || isAndroid)
  const [active, setActive] = useState(tools[0].id)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null)
  const timer = useRef<number>()

  const notify: Notify = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  const tool = tools.find((t) => t.id === active)!
  const View = tool.View

  return (
    <div className="app">
      <nav className="nav" aria-label="Tools">
        <div className="brand"><span className="mark" aria-hidden>F</span><span className="brand-name">Folio</span></div>
        <ul>
          {tools.map((t) => (
            <li key={t.id}>
              <button className={'nav-item' + (t.id === active ? ' on' : '')} onClick={() => setActive(t.id)} aria-current={t.id === active}>
                <t.icon size={18} strokeWidth={1.75} /><span>{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="main">
        <header className="head"><h1>{tool.title}</h1><p>{tool.desc}</p></header>
        <section className="panel" key={tool.id}><View notify={notify} /></section>
      </main>
      {toast && <div className={'toast ' + toast.kind} role="status">{toast.msg}</div>}
    </div>
  )
}
