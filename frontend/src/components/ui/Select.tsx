import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

export interface SelectOption {
  value: string
  label: string
}

/** Lista customizada no tema do painel; evita o menu nativo do SO (hover azul). */
export function Select({
  value,
  options,
  onChange,
  disabled = false,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
}) {
  const generatedId = useId()
  const listId = `${generatedId}-list`
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const selected = options.find(item => item.value === value) ?? options[0]
  const selectedIndex = Math.max(0, options.findIndex(item => item.value === selected?.value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  function placeMenu() {
    const node = trigger.current
    if (!node) return
    const box = node.getBoundingClientRect()
    const maxHeight = Math.min(280, window.innerHeight * 0.5)
    const spaceBelow = window.innerHeight - box.bottom - 8
    const openUp = spaceBelow < Math.min(maxHeight, options.length * 44) && box.top > spaceBelow
    setMenuStyle({
      position: 'fixed',
      left: box.left,
      width: box.width,
      top: openUp ? undefined : box.bottom + 4,
      bottom: openUp ? window.innerHeight - box.top + 4 : undefined,
      maxHeight,
      // Above public site-nav / drawer chrome (≈1000–1002).
      zIndex: 1200,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    placeMenu()
    listRef.current?.focus()
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    setActiveIndex(selectedIndex)
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (root.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    const onReposition = () => placeMenu()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, selectedIndex])

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    trigger.current?.focus()
  }

  function move(delta: number) {
    setActiveIndex(index => (index + delta + options.length) % options.length)
  }

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(options[activeIndex].value)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
  }

  return (
    <div className={['ui-select', className].filter(Boolean).join(' ')} data-theme-part="select" ref={root}>
      <button
        type="button"
        ref={trigger}
        id={id}
        className="ui-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={event => {
          event.preventDefault()
          setOpen(current => !current)
        }}
        onKeyDown={onTriggerKey}
      >
        <span>{selected?.label ?? ''}</span>
      </button>
      {open && createPortal(
        <ul
          id={listId}
          ref={listRef}
          className="ui-select-list"
          data-ui-select-list=""
          role="listbox"
          tabIndex={-1}
          style={menuStyle}
          aria-activedescendant={`${listId}-option-${activeIndex}`}
          onKeyDown={onListKey}
          onPointerDown={event => event.stopPropagation()}
        >
          {options.map((item, index) => (
            <li
              key={item.value}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={item.value === selected?.value}
              className={index === activeIndex ? 'is-active' : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onPointerDown={event => {
                event.preventDefault()
                event.stopPropagation()
                choose(item.value)
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}
