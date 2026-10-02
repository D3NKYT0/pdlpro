import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Castle, Anchor, Mountain, Skull, Tent, ArrowLeft, Search } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { LOCATIONS, getAllTerritories } from '../lib/locations-data'

export function ValoremLocationsPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')
  const [selectedTerritory, setSelectedTerritory] = useState('all')

  const territories = useMemo(() => ['all', ...getAllTerritories()], [])

  const filteredLocations = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      const matchesSearch =
        !search.trim() ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.territory.toLowerCase().includes(search.toLowerCase())
      const matchesTerritory =
        selectedTerritory === 'all' || loc.territory === selectedTerritory

      return matchesSearch && matchesTerritory
    })
  }, [search, selectedTerritory])

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'town':
      case 'village':
        return <Castle className="w-4 h-4 text-amber-400" />
      case 'castle':
      case 'fortress':
        return <Shield className="w-4 h-4 text-purple-400" />
      case 'dungeon':
        return <Skull className="w-4 h-4 text-red-400" />
      case 'hunting_zone':
        return <Tent className="w-4 h-4 text-emerald-400" />
      default:
        return <MapPin className="w-4 h-4 text-primary" />
    }
  }

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
        title={t('wiki.locations.title', 'Localizações & Zonas')}
        subtitle={t('wiki.locations.description', 'Cidades, masmorras e zonas de caça')}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Filters */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar localidade ou região..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center overflow-x-auto pb-1">
            {territories.map((territory) => (
              <button
                key={territory}
                type="button"
                onClick={() => setSelectedTerritory(territory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  selectedTerritory === territory
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {territory === 'all' ? 'Todos os Territórios' : territory}
              </button>
            ))}
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="p-4 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {getLocationIcon(loc.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {loc.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{loc.territory}</p>
                    </div>
                  </div>

                  {loc.level && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/20">
                      Lv. {loc.level}
                    </span>
                  )}
                </div>
              </div>

              {loc.coords && (
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>X: {loc.coords.x}, Y: {loc.coords.y}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredLocations.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma localidade encontrada com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
function Shield(props: any) {
  return <Castle {...props} />
}
