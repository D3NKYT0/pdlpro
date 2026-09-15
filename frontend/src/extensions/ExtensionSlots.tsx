import { Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { programsApi } from '../services/api'
import { extensionSlotItems } from './registry'
import { isExtensionResourceEnabled, type ExtensionSlot } from './types'

/** Renderiza os blocos da extensão ativa no encaixe do core. */
export function ExtensionSlotOutlet({ slot }: { slot: ExtensionSlot }) {
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const items = extensionSlotItems(slot)
  const gated = items.some((item) => item.resource)
  if (gated && resources.isPending) return null
  const visible = items.filter((item) =>
    isExtensionResourceEnabled(resources.data, item.resource),
  )
  if (visible.length === 0) return null
  return (
    <>
      {visible.map((item) => (
        <Fragment key={item.key}>{item.element}</Fragment>
      ))}
    </>
  )
}
