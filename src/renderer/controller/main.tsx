import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../fonts.css'
import './controller.css'
import { App } from './App'

const host = document.getElementById('root')
if (!host) throw new Error('#root 없음')

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
