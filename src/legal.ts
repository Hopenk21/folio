import privacy from './legal/privacy.md?raw'
import terms from './legal/terms.md?raw'
import eula from './legal/eula.md?raw'

export interface LegalDoc { id: string; title: string; text: string }

export const LEGAL_DOCS: LegalDoc[] = [
  { id: 'privacy', title: 'Privacy Policy', text: privacy },
  { id: 'terms', title: 'Terms of Service', text: terms },
  { id: 'eula', title: 'End User License Agreement', text: eula },
]
