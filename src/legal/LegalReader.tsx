import { useEffect } from 'react'
import { X } from 'lucide-react'
import { LEGAL_DOCS } from '../legal'
import Markdown from './Markdown'

/** Full-screen reader for a legal document. Works offline: the text ships inside the app. */
export default function LegalReader({ id, onClose }: { id: string; onClose: () => void }) {
  const doc = LEGAL_DOCS.find((d) => d.id === id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!doc) return null
  return (
    <div className="viewer legal" role="dialog" aria-label={doc.title}>
      <div className="viewer-bar">
        <button className="icon" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <span className="viewer-title">{doc.title}</span>
      </div>
      <div className="viewer-scroll"><Markdown text={doc.text} /></div>
    </div>
  )
}
