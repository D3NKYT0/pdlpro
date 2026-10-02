import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calculator, ArrowLeft, Coins, Plus, Minus, Package, Search } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import itemsData from '../../data/items-for-select.json'
import { calculateAdenaCraftCost } from '../lib/wiki-utils'

interface CraftEntry {
  item: any
  quantity: number
  rate: number
  grade: string
}

export function ValoremCraftCalculatorPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<CraftEntry[]>([
    {
      item: (itemsData as any[])[0] || { value: '1', label: 'Item de Exemplo', icon: '' },
      quantity: 1,
      rate: 100,
      grade: 'a',
    },
  ])

  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return []
    const term = search.toLowerCase()
    return (itemsData as any[])
      .filter((i) => i.label.toLowerCase().includes(term))
      .slice(0, 10)
  }, [search])

  const addItem = (item: any) => {
    setSelectedItems((prev) => [
      ...prev,
      { item, quantity: 1, rate: 100, grade: 'a' },
    ])
    setSearch('')
  }

  const updateQuantity = (index: number, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, quantity: Math.max(1, entry.quantity + delta) } : entry
      )
    )
  }

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalAdena = useMemo(() => {
    return selectedItems.reduce((acc, entry) => {
      return acc + calculateAdenaCraftCost(entry.grade, entry.rate, entry.quantity)
    }, 0)
  }, [selectedItems])

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-5xl mx-auto pt-6">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.categories.calculator', 'Calculadora de Craft')}
        subtitle={t('wiki.categories.calculatorDesc', 'Estime custos de adena e materiais de receitas')}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Search & Add Item */}
        <div className="bg-card/60 p-5 rounded-xl border border-white/10 backdrop-blur-md relative">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider block mb-2">
            Adicionar Item para Craft:
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome de uma arma, armadura ou material..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Autocomplete dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-5 right-5 top-[90px] z-30 bg-card border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/10">
              {searchResults.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => addItem(item)}
                  className="w-full text-left p-3 hover:bg-white/10 text-xs font-medium text-foreground flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="font-mono text-muted-foreground">ID: {item.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Items List */}
        <div className="rounded-xl border border-white/10 bg-card/60 overflow-hidden shadow-lg divide-y divide-white/5">
          {selectedItems.map((entry, index) => (
            <div
              key={index}
              className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{entry.item.label}</h4>
                  <p className="text-xs text-muted-foreground font-mono">ID: {entry.item.value}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Rate select */}
                <select
                  value={entry.rate}
                  onChange={(e) => {
                    const r = Number(e.target.value)
                    setSelectedItems((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, rate: r } : item))
                    )
                  }}
                  className="bg-background/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value={100}>Taxa 100%</option>
                  <option value={70}>Taxa 70%</option>
                  <option value={60}>Taxa 60%</option>
                </select>

                {/* Grade select */}
                <select
                  value={entry.grade}
                  onChange={(e) => {
                    const g = e.target.value
                    setSelectedItems((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, grade: g } : item))
                    )
                  }}
                  className="bg-background/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-none font-bold"
                >
                  <option value="d">Grade D</option>
                  <option value="c">Grade C</option>
                  <option value="b">Grade B</option>
                  <option value="a">Grade A</option>
                  <option value="s">Grade S</option>
                </select>

                {/* Quantity Controls */}
                <div className="flex items-center border border-white/10 rounded-lg bg-black/40">
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, -1)}
                    className="p-1.5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-mono font-bold text-foreground">
                    {entry.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, 1)}
                    className="p-1.5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}

          {selectedItems.length === 0 && (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Nenhum item adicionado à lista. Use o campo acima para buscar itens.
            </div>
          )}
        </div>

        {/* Total Cost Bar */}
        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-card/80 to-card/80 border border-amber-500/30 rounded-xl p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Custo Estimado de Adena de Criação:
                </span>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {totalAdena.toLocaleString('pt-BR')} Adena
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
