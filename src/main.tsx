import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App'
import { initRestore } from './platform'
import './styles.css'

initRestore()
createRoot(document.getElementById('root')!).render(<App />)
