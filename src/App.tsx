import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { ArrowLeft, Combine, FileOutput, FileText, House, LayoutGrid, Minimize2, ScanLine, Scissors, Stamp as StampIcon } from 'lucide-react'
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

interface Tool { id: string; group: string; label: string; title: string; desc: string; icon: typeof Combine; View: ComponentType<ToolProps>; androidOnly?: boolean }

const TOOLS: Tool[] = [
  { id: 'merge', group: 'Organize', label: 'Merge', title: 'Merge PDFs', desc: 'Combine several PDFs into one, in the order you choose.', icon: Combine, View: Merge },
  { id: 'organize', group: 'Organize', label: 'Organize', title: 'Organize pages', desc: 'Reorder, rotate and delete pages.', icon: LayoutGrid, View: Organize },
  { id: 'split', group: 'Organize', label: 'Split', title: 'Split or extract', desc: 'Pull out page ranges or cut into parts.', icon: Scissors, View: Split },
  { id: 'stamp', group: 'Edit', label: 'Stamp', title: 'Watermark and numbers', desc: 'Add a watermark or page numbers.', icon: StampIcon, View: Stamp },
  { id: 'optimize', group: 'Edit', label: 'Optimize', title: 'Optimize', desc: 'Tidy structure and strip metadata.', icon: Minimize2, View: Optimize },
  { id: 'toword', group: 'Convert', label: 'To Word', title: 'PDF to Word', desc: 'Turn a text PDF into an editable document.', icon: FileText, View: ToWord },
  { id: 'topdf', group: 'Convert', label: 'To PDF', title: 'Word to PDF', desc: 'Turn a Word document into a PDF.', icon: FileOutput, View: ToPdf },
  { id: 'scan', group: 'Capture', label: 'Scan', title: 'Scan documents', desc: 'Capture pages with your camera and save as PDF.', icon: ScanLine, View: Scan, androidOnly: true },
]
const GROUPS = ['Organize', 'Edit', 'Convert', 'Capture']


const USE_KEY = 'folio.usage'
const readUsage = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(USE_KEY) || '{}') } catch { return {} }
}
const bumpUsage = (id: string) => {
  try { const u = readUsage(); u[id] = (u[id] || 0) + 1; localStorage.setItem(USE_KEY, JSON.stringify(u)) } catch { /* storage unavailable */ }
}
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const a = window.setTimeout(() => setLeaving(true), 1300)
    const b = window.setTimeout(onDone, 1750)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [onDone])
  return (
    <div className={'splash' + (leaving ? ' out' : '')} aria-hidden>
      <div className="splash-logo"><Logo size={96} /></div>
      <p className="splash-name">Folio</p>
      <p className="splash-tag">Your PDF toolkit</p>
    </div>
  )
}

function Logo({ size = 28 }: { size?: number }) {
  const [broken, setBroken] = useState(false)
  if (broken)
    return <span className="mark" style={{ width: size, height: size, fontSize: size * 0.52 }} aria-hidden>F</span>
  return <img className="logo" src="./logo.png" width={size} height={size} alt="" onError={() => setBroken(true)} />
}

export default function App() {
  const tools = TOOLS.filter((t) => !t.androidOnly || isAndroid)
  const [active, setActive] = useState<string>('home')
  const [splash, setSplash] = useState(true)
  const [usage, setUsage] = useState(readUsage)
  const activeRef = useRef('home')
  activeRef.current = active
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null)
  const timer = useRef<number>()

  const notify: Notify = useCallback((msg, kind = 'ok') => {
    if (kind === 'ok' && activeRef.current !== 'home') { bumpUsage(activeRef.current); setUsage(readUsage()) }
    setToast({ msg, kind })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  const tool = tools.find((t) => t.id === active)
  const jumpBack = tools.filter((t) => usage[t.id]).sort((x, y) => usage[y.id] - usage[x.id]).slice(0, 3)
  const View = tool?.View

  return (
    <div className="app">
      {splash && <Splash onDone={() => setSplash(false)} />}
      <nav className="nav" aria-label="Tools">
        <button className="brand" onClick={() => setActive('home')} aria-label="Folio home"><Logo /><span className="brand-name">Folio</span></button>
        <ul>
          <li><button className={'nav-item' + (active === 'home' ? ' on' : '')} onClick={() => setActive('home')}><House size={18} strokeWidth={1.75} /><span>All tools</span></button></li>
        </ul>
        {GROUPS.map((g) => {
          const items = tools.filter((t) => t.group === g)
          if (!items.length) return null
          return (
            <div key={g}>
              <p className="nav-group">{g}</p>
              <ul>
                {items.map((t) => (
                  <li key={t.id}>
                    <button className={'nav-item' + (t.id === active ? ' on' : '')} onClick={() => setActive(t.id)} aria-current={t.id === active}>
                      <t.icon size={18} strokeWidth={1.75} /><span>{t.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        <p className="nav-foot">Files stay on this device.</p>
      </nav>

      <main className="main">
        {!tool && (
          <div className="home">
            <div className="home-top"><Logo size={36} /></div>
            <p className="hello">{greeting()}</p>
            <h1 className="home-title">What would you like to do?</h1>
            <p className="home-sub">Everything runs on your device. Your files are never uploaded.</p>
            {jumpBack.length > 0 && (
              <section>
                <h2 className="group">Jump back in</h2>
                <div className="chips">
                  {jumpBack.map((t) => (
                    <button key={t.id} className="chip" onClick={() => setActive(t.id)}><t.icon size={16} strokeWidth={1.8} />{t.label}</button>
                  ))}
                </div>
              </section>
            )}
            {GROUPS.map((g) => {
              const items = tools.filter((t) => t.group === g)
              if (!items.length) return null
              return (
                <section key={g}>
                  <h2 className="group">{g}</h2>
                  <div className="tiles">
                    {items.map((t) => (
                      <button key={t.id} className="tile" onClick={() => setActive(t.id)}>
                        <span className="tile-icon"><t.icon size={20} strokeWidth={1.7} /></span>
                        <span className="tile-title">{t.title}</span>
                        <span className="tile-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
        {tool && View && (
          <>
            <header className="head">
              <button className="back" onClick={() => setActive('home')}><ArrowLeft size={16} /> All tools</button>
              <h1>{tool.title}</h1>
              <p>{tool.desc}</p>
            </header>
            <section className="panel" key={tool.id}><View notify={notify} /></section>
          </>
        )}
      </main>
      {toast && (
        <div className={'toast ' + toast.kind} role="status">
          <span>{toast.msg}</span>
          {toast.kind === 'ok' && <button onClick={() => { setActive('home'); setToast(null) }}>More tools</button>}
        </div>
      )}
    </div>
  )
}
