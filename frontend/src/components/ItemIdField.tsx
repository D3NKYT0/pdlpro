import { Field } from './ui/Field'
import { useEffect, useRef, useState } from 'react'
import { ItemIcon } from './ItemIcon'
import { useItemCatalog, type L2CatalogItem } from '../lib/item-icons'

interface ItemIdFieldProps {
  value: string
  onChange: (id: string, item: L2CatalogItem | null) => void
  required?: boolean
  label?: string
}

export function ItemIdField({ value, onChange, required, label = 'Item' }: ItemIdFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLLabelElement>(null)
  const catalog = useItemCatalog()
  const selected = catalog.getById(value)
  const suggestions = catalog.search(open ? query : value)

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <Field className="item-id-field" ref={containerRef}>
      {label}
      <div className="item-id-control">
        <ItemIcon itemId={value} name={selected?.name} size={34} />
        <input
          value={open ? query : selected ? `${selected.id} — ${selected.name}` : value}
          placeholder={catalog.isPending ? 'Carregando catálogo…' : 'ID ou nome do item'}
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
      {catalog.isError && <small role="alert">Catálogo indisponível. <button type="button" onClick={() => void catalog.refetch()}>Tentar novamente</button></small>}
      {open && !catalog.isPending && !catalog.isError && query.trim() && !suggestions.length && <small>Nenhum item encontrado no catálogo.</small>}
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
                <small>ID {item.id} · {item.grade}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}
