import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sword, Search, ArrowLeft, Shield, Sparkles, Package } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import itemsData from '../../data/items-for-select.json'
import { getIconUrl } from '../lib/wiki-utils'

export function ValoremItemsPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 32

  const filteredItems = useMemo(() => {
    if (!search.trim()) return itemsData as any[]
    const term = search.toLowerCase()
    return (itemsData as any[]).filter(
      (item) => item.label.toLowerCase().includes(term) || item.value.includes(term)
    )
  }, [search])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page])

  const totalPages = Math.ceil(filteredItems.length / pageSize)

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-6xl mx-auto pt-6">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.categories.items', 'Catálogo de Itens & Equipamentos')}
        subtitle={`${filteredItems.length} itens catalogados no banco de dados`}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome do item ou ID..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Grid of items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {paginatedItems.map((item) => {
            const iconUrl = getIconUrl(item.icon)

            return (
              <div
                key={item.value}
                className="p-3 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 hover:border-primary/40 transition-all flex items-center gap-3 shadow-sm group"
              >
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                  <img
                    src={iconUrl}
                    alt={item.label}
                    onError={(e) => {
                      // Fallback icon
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                    className="w-8 h-8 object-contain"
                  />
                  <Package className="w-5 h-5 text-muted-foreground hidden only:block" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    {item.label}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    ID: {item.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card/60 border border-white/10 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-muted-foreground px-2">
              Página <strong className="text-foreground">{page}</strong> de{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card/60 border border-white/10 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
