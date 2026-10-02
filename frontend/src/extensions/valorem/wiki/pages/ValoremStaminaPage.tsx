import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, ArrowRight, Zap, Info, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'

const NumberInput = ({
  value,
  onChange,
  max,
  label,
}: {
  value: number
  onChange: (val: number) => void
  max: number
  label: string
}) => {
  const [localValue, setLocalValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused && parseInt(localValue, 10) !== value) {
      setLocalValue(value.toString())
    }
  }, [value, isFocused, localValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '' || /^\d+$/.test(val)) {
      setLocalValue(val)
      const parsed = parseInt(val, 10)
      if (!isNaN(parsed)) {
        onChange(parsed)
      }
    }
  }

  return (
    <div className="relative group">
      <div className="relative flex items-center bg-background/50 border border-white/10 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all backdrop-blur-sm shadow-inner group-hover:border-white/20">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            setLocalValue(value.toString())
          }}
          className="w-full bg-transparent px-4 py-4 text-center text-3xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none z-10"
        />

        <div className="flex flex-col border-l border-white/10 h-full w-8 z-20 bg-black/20">
          <button
            onClick={() => onChange(Math.min(max, value + 1))}
            className="flex-1 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors border-b border-white/10"
            type="button"
          >
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex-1 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
            type="button"
          >
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="text-center mt-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-70">
        {label}
      </div>
    </div>
  )
}

export function ValoremStaminaPage() {
  const { t } = useTranslation('ext.valorem')
  const [currentH, setCurrentH] = useState<number>(30)
  const [currentM, setCurrentM] = useState<number>(0)
  const [desiredH, setDesiredH] = useState<number>(42)
  const [desiredM, setDesiredM] = useState<number>(0)
  const [offlineTime, setOfflineTime] = useState<string>('')

  useEffect(() => {
    const currentTotalMinutes = currentH * 60 + currentM
    const desiredTotalMinutes = desiredH * 60 + desiredM

    if (desiredTotalMinutes <= currentTotalMinutes) {
      setOfflineTime('0h 00m')
      return
    }

    if (desiredTotalMinutes > 42 * 60) {
      setDesiredH(42)
      setDesiredM(0)
      return
    }

    let neededOfflineMinutes = 0
    const bonusThreshold = 39 * 60
    let simulatedStamina = currentTotalMinutes

    if (simulatedStamina < bonusThreshold) {
      const minutesInRegular = Math.min(desiredTotalMinutes, bonusThreshold) - simulatedStamina
      if (minutesInRegular > 0) {
        neededOfflineMinutes += minutesInRegular * 3
        simulatedStamina += minutesInRegular
      }
    }

    if (simulatedStamina >= bonusThreshold && simulatedStamina < desiredTotalMinutes) {
      const minutesInBonus = desiredTotalMinutes - simulatedStamina
      if (minutesInBonus > 0) {
        neededOfflineMinutes += minutesInBonus * 6
      }
    }

    const finalH = Math.floor(neededOfflineMinutes / 60)
    const finalM = neededOfflineMinutes % 60
    setOfflineTime(`${finalH}h ${finalM < 10 ? '0' : ''}${finalM}m`)
  }, [currentH, currentM, desiredH, desiredM])

  const handleTimeChange = (type: 'current' | 'desired', field: 'h' | 'm', value: number) => {
    const num = isNaN(value) ? 0 : value
    if (type === 'current') {
      if (field === 'h') setCurrentH(Math.min(42, Math.max(0, num)))
      if (field === 'm') setCurrentM(Math.min(59, Math.max(0, num)))
    } else {
      if (field === 'h') setDesiredH(Math.min(42, Math.max(0, num)))
      if (field === 'm') setDesiredM(Math.min(59, Math.max(0, num)))
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-4xl mx-auto pt-6">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.categories.stamina', 'Calculadora de Estamina')}
        subtitle={t('wiki.categories.staminaDesc', 'Planeje sua recuperação de tempo offline')}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card/60 border border-white/10 rounded-xl p-6 md:p-8 space-y-6 backdrop-blur-md shadow-lg">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-primary uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Estamina Atual</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  value={currentH}
                  onChange={(v) => handleTimeChange('current', 'h', v)}
                  max={42}
                  label="Horas (0-42)"
                />
                <NumberInput
                  value={currentM}
                  onChange={(v) => handleTimeChange('current', 'm', v)}
                  max={59}
                  label="Minutos (0-59)"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-primary uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Estamina Desejada</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  value={desiredH}
                  onChange={(v) => handleTimeChange('desired', 'h', v)}
                  max={42}
                  label="Horas (0-42)"
                />
                <NumberInput
                  value={desiredM}
                  onChange={(v) => handleTimeChange('desired', 'm', v)}
                  max={59}
                  label="Minutos (0-59)"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 via-card/60 to-card/60 border border-primary/20 rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-xl">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Tempo Offline Necessário</span>
              </h3>
              <p className="text-4xl md:text-5xl font-extrabold text-foreground font-mono tracking-tight mt-4">
                {offlineTime}
              </p>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-black/40 border border-white/5 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Info className="w-4 h-4 text-primary" />
                <span>Como funciona a regeneração:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-yellow-400">Zona Normal (0h a 39h):</strong> 3 horas offline = 1 hora de estamina recuperada (proporção 3:1).</li>
                <li><strong className="text-emerald-400">Zona Bônus (39h a 42h):</strong> 6 horas offline = 1 hora de estamina recuperada (proporção 6:1).</li>
                <li>Limite máximo acumulável no servidor: <strong>42 horas</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
