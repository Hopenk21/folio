import { useRef, useState, type ReactNode, type DragEvent } from 'react'
import { Upload } from 'lucide-react'

export type Notify = (msg: string, kind?: 'ok' | 'error') => void
export interface ToolProps { notify: Notify }
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
  const [over, setOver] = useState(false)
  const take = async (files: FileList | null) => { if (files?.length) props.onFiles(await readFiles(files)) }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }
  return (
    <button type="button" className={'drop' + (over ? ' over' : '')}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <Upload size={20} strokeWidth={1.75} />
      <span className="drop-label">{props.label}</span>
      {props.hint && <span className="drop-hint">{props.hint}</span>}
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
