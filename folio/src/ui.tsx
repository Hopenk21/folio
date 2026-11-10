import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type DragEvent } from 'react'
import { histAdd } from './platform'
import { Eye, FilePlus2 } from 'lucide-react'

export type Notify = (msg: string, kind?: 'ok' | 'error') => void
export interface ToolProps {
  notify: Notify
  incoming?: Picked[]
  clearIncoming?: () => void
  openIn?: (toolId: string, files: Picked[]) => void
}
export const ToolCtx = createContext('')

/** If a document was sent here from History, open it once on arrival. */
export function useIncoming(props: ToolProps, handler: (files: Picked[]) => void) {
  useEffect(() => {
    if (props.incoming?.length) { handler(props.incoming); props.clearIncoming?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
export interface Picked { name: string; bytes: Uint8Array }
export interface Item extends Picked { id: string; pages?: number }

let counter = 0
export const nid = () => String(++counter)
export const baseName = (n: string) => n.replace(/\.[^.]+$/, '')
export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

export async function readFiles(list: FileList | File[]): Promise<Picked[]> {
  return Promise.all(Array.from(list).map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })))
}

export function useTask(notify: Notify): [boolean, (fn: () => Promise<void>) => Promise<void>] {
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } catch (e: any) { notify(e?.message || 'Something went wrong', 'error') } finally { setBusy(false) }
  }
  return [busy, run]
}

export function Drop(props: { accept: string; multiple?: boolean; label: string; hint?: string; onFiles: (f: Picked[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const tool = useContext(ToolCtx)
  const [over, setOver] = useState(false)
  const take = async (files: FileList | null) => {
    if (!files?.length) return
    const picked = await readFiles(files)
    props.onFiles(picked)
    picked.forEach((f) => histAdd(f.name, f.bytes, tool).catch(() => {})) // remember it in History
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }
  return (
    <button type="button" className={'drop' + (over ? ' over' : '')}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <span className="drop-icon"><FilePlus2 size={22} strokeWidth={1.6} /></span>
      <span className="drop-label">{props.label}</span>
      {props.hint && <span className="drop-hint">{props.hint}</span>}
      <span className="drop-cta">Browse files</span>
      <input ref={input} type="file" hidden accept={props.accept} multiple={props.multiple}
        onChange={(e) => { take(e.target.files); e.target.value = '' }} />
    </button>
  )
}

export function Button(props: { children: ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; variant?: 'primary' | 'quiet' }) {
  return (
    <button type="button" className={'btn ' + (props.variant ?? 'primary')} onClick={props.onClick} disabled={props.disabled || props.busy}>
      {props.busy ? 'Working…' : props.children}
    </button>
  )
}

export function Field(props: { label: string; children: ReactNode; note?: string }) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.note && <span className="field-note">{props.note}</span>}
    </label>
  )
}

export const Note = ({ children }: { children: ReactNode }) => <p className="note">{children}</p>

// ---- PDF viewer access for every tool ----
export const ViewerCtx = createContext<(name: string, bytes: Uint8Array) => void>(() => {})
export const useViewer = () => useContext(ViewerCtx)

/** The "file you picked" card, with a View button for PDFs. */
export function FileCard({ file, sub }: { file: Picked; sub?: string }) {
  const view = useViewer()
  const isPdf = /\.pdf$/i.test(file.name)
  return (
    <div className="card filecard">
      <div className="row-main">
        <p className="row-title">{file.name}</p>
        {sub && <p className="row-sub">{sub}</p>}
      </div>
      {isPdf && <button className="btn quiet sm" onClick={() => view(file.name, file.bytes)}><Eye size={15} /> View</button>}
    </div>
  )
}
