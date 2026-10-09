import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Mantém a digitação parcial local; só publica inteiros válidos no perfil enviado à API. */
export function CoordinateInput({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  const { t } = useTranslation('admin')
  const [draft, setDraft] = useState(String(value))
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setDraft(current => /^-?[0-9]+$/.test(current) && Number(current) === value ? current : String(value))
  }, [value])
  useEffect(() => {
    const outsideRange = /^-?[0-9]+$/.test(draft) && (Number(draft) < -2147483648 || Number(draft) > 2147483647)
    input.current?.setCustomValidity(outsideRange ? t('characterCreation.coordinateRange') : '')
  }, [draft, t])
  return <input ref={input} disabled={disabled} type="text" inputMode="text" required pattern="-?[0-9]+" value={draft} onChange={event => {
    const text = event.target.value
    setDraft(text)
    const number = Number(text)
    if (/^-?[0-9]+$/.test(text) && number >= -2147483648 && number <= 2147483647) onChange(number)
  }} />
}

