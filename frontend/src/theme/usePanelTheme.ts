import { useEffect } from 'react'
import { useDefaultTheme } from './useDefaultTheme'

export function usePanelTheme() {
  useDefaultTheme()

  useEffect(() => {
    document.documentElement.classList.add('pdl-panel')
    return () => document.documentElement.classList.remove('pdl-panel')
  }, [])
}
