import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initializeMonitoring } from './observability'
import './styles/global.css'

const rootElement = document.getElementById('root')!

void initializeMonitoring(import.meta.env).then((errorHandlers) => {
  createRoot(rootElement, errorHandlers).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
