import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FolderOpen, Share2, Trash2 } from 'lucide-react'
import { isElectron, libDelete, libExport, libList, libShare, type LibFile } from '../platform'
import { fmtSize, ToolProps } from '../ui'

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const extOf = (n: string) => (n.split('.').pop() || '').toLowerCase()

export default function Library({ notify }: ToolProps) {
  const [files, setFiles] = useState<LibFile[] | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const timer = useRef<number>()

  const refresh = useCallback(async () => setFiles(await libList()), [])
  useEffect(() => { refresh() }, [refresh])

  const share = async (name: string) => {
    try { await libShare(name) } catch (e: any) { notify(e?.message || 'Could not share that file', 'error') }
  }
  const copy = async (name: string) => {
    try { if (await libExport(name)) notify('Copy saved') } catch (e: any) { notify(e?.message || 'Could not save a copy', 'error') }
  }
  const remove = async (name: string) => {
    if (confirm !== name) {
      setConfirm(name)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setConfirm(null), 3000)
      return
    }
    try { await libDelete(name); setConfirm(null); await refresh() } catch (e: any) { notify(e?.message || 'Could not delete that file', 'error') }
  }

  if (files === null) return <p className="row-sub">Loading…</p>
  if (!files.length)
    return (
      <div className="empty">
        <span className="drop-icon"><FolderOpen size={22} strokeWidth={1.6} /></span>
        <p className="empty-title">Nothing here yet</p>
        <p className="row-sub">Everything you make in Folio is kept here, on this device, until you share or delete it.</p>
      </div>
    )

  return (
    <>
      <p className="note">{files.length} {files.length === 1 ? 'file' : 'files'} kept on this device. Nothing leaves Folio until you share it.</p>
      <ul className="list">
        {files.map((f) => (
          <li className="row" key={f.name}>
            <span className={'badge ' + extOf(f.name)}>{extOf(f.name).toUpperCase() || 'FILE'}</span>
            <div className="row-main">
              <span className="row-title">{f.name}</span>
              <span className="row-sub">{fmtSize(f.size)} · {fmtDate(f.mtime)}</span>
            </div>
            {isElectron ? (
              <>
                <button className="icon" aria-label="Show in folder" title="Show in folder" onClick={() => share(f.name)}><FolderOpen size={16} /></button>
                <button className="icon" aria-label="Save a copy" title="Save a copy" onClick={() => copy(f.name)}><Download size={16} /></button>
              </>
            ) : (
              <button className="icon share" aria-label={`Share ${f.name}`} onClick={() => share(f.name)}><Share2 size={16} /></button>
            )}
            <button className={'icon' + (confirm === f.name ? ' danger' : '')} aria-label={confirm === f.name ? 'Tap again to delete' : 'Delete'} onClick={() => remove(f.name)}>
              {confirm === f.name ? <span className="sure">Delete?</span> : <Trash2 size={16} />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
