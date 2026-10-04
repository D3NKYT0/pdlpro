import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initializeTrackingConsent } from './lib/tracking'
import { initializeMonitoring } from './observability'
import './i18n'
import './styles/global.css'

initializeTrackingConsent()

const rootElement = document.getElementById('root')!

void initializeMonitoring(import.meta.env).then((errorHandlers) => {
  createRoot(rootElement, errorHandlers).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
