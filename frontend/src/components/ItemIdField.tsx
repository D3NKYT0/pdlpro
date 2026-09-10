import { Field } from './ui/Field'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ItemIcon } from './ItemIcon'
import { useItemCatalog, type L2CatalogItem } from '../hooks/useItemCatalog'

interface ItemIdFieldProps {
  value: string
  onChange: (id: string, item: L2CatalogItem | null) => void
  required?: boolean
  label?: string
}

export function ItemIdField({ value, onChange, required, label }: ItemIdFieldProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLLabelElement>(null)
  const catalog = useItemCatalog()
  const selected = catalog.getById(value)
  const suggestions = catalog.search(open ? query : value)
  const fieldLabel = label ?? 'Item'

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <Field className="item-id-field" ref={containerRef}>
      {fieldLabel}
      <div className="item-id-control">
        <ItemIcon itemId={value} name={selected?.name} size={34} />
        <input
          value={open ? query : selected ? `${selected.id} — ${selected.name}` : value}
          placeholder={catalog.isPending ? t('itemCatalogLoading') : t('itemCatalogPlaceholder')}
          autoComplete="off"
          required={required}
          onFocus={() => {
            setQuery(value)
            setOpen(true)
          }}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            setOpen(true)
            const digits = next.trim()
            if (/^\d+$/.test(digits)) onChange(digits, catalog.getById(digits))
            else onChange('', null)
          }}
        />
      </div>
      {catalog.isError && (
        <small role="alert">
          {t('itemCatalogUnavailable')}{' '}
          <button type="button" onClick={() => void catalog.refetch()}>
            {t('retry')}
          </button>
        </small>
      )}
      {open && !catalog.isPending && !catalog.isError && query.trim() && !suggestions.length && (
        <small>{t('itemCatalogEmpty')}</small>
      )}
      {open && suggestions.length > 0 ? (
        <div className="item-id-suggestions">
          {suggestions.map((item) => (
            <button
              key={`${item.id}-${item.name}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item.id, item)
                setQuery(item.id)
                setOpen(false)
              }}
            >
              <ItemIcon itemId={item.id} name={item.name} size={24} />
              <span>
                <strong>{item.name}</strong>
                <small>{t('itemIdMeta', { id: item.id, grade: item.grade })}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}
