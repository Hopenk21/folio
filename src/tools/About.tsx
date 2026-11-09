import { ChevronRight } from 'lucide-react'
import pkg from '../../package.json'
import { CONTACT_EMAIL } from '../config'
import { LEGAL_DOCS } from '../legal'
import { ToolProps, useLegal } from '../ui'

export default function About(_props: ToolProps) {
  const openLegal = useLegal()
  return (
    <>
      <div className="card about">
        <img className="logo" src="./logo.png" width={56} height={56} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <div className="row-main">
          <p className="row-title" style={{ fontSize: 17 }}>Folio</p>
          <p className="row-sub">Version {pkg.version} · Made by Hope Nkuna</p>
        </div>
      </div>
      <p className="note">Folio works on your device. We do not collect your files, and there are no accounts, ads or tracking.</p>

      <h2 className="group" style={{ margin: '8px 0 0' }}>Legal</h2>
      <ul className="list">
        {LEGAL_DOCS.map((d) => (
          <li className="row" key={d.id}>
            <button className="row-tap" onClick={() => openLegal(d.id)}>
              <span className="row-main"><span className="row-title">{d.title}</span></span>
              <ChevronRight size={16} className="chev" />
            </button>
          </li>
        ))}
      </ul>

      <h2 className="group" style={{ margin: '8px 0 0' }}>Contact</h2>
      <div className="card"><p className="row-title">{CONTACT_EMAIL}</p><p className="row-sub">Questions about privacy, terms or the app</p></div>

      <h2 className="group" style={{ margin: '8px 0 0' }}>Open-source software</h2>
      <p className="note">Folio is built with React, pdf-lib, PDF.js, docx, mammoth, JSZip, Lucide icons, the Inter typeface, Electron and Capacitor. Each is used under its own licence, and the full licence texts are available in each project’s repository.</p>
    </>
  )
}
