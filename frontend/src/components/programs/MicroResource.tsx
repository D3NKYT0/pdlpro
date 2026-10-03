import type { ReactNode } from 'react'
import { useResourceControls } from '../../contexts/ResourceControlsContext'

/** Omite uma parte opcional da interface quando ela ou um ancestral estiver desativado. */
export function MicroResource({ code, children }: { code: string; children: ReactNode }) {
  const enabled = useResourceControls()
  return enabled(code) ? <>{children}</> : null
}
