import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Crown, MapPin, Search, Map as MapIcon, ArrowLeft, Filter } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import bossesData from '../../data/raid-bosses.json'

export function ValoremRaidBossesPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')
  const [levelRange, setLevelRange] = useState<string>('all')

  const filteredBosses = useMemo(() => {
    return (bossesData as any[]).filter((boss) => {
      const matchesSearch =
        !search.trim() ||
        boss.name.toLowerCase().includes(search.toLowerCase()) ||
        String(boss.level).includes(search)

      let matchesLevel = true
      if (levelRange === '20-39') matchesLevel = boss.level >= 20 && boss.level <= 39
      else if (levelRange === '40-59') matchesLevel = boss.level >= 40 && boss.level <= 59
      else if (levelRange === '60-74') matchesLevel = boss.level >= 60 && boss.level <= 74
      else if (levelRange === '75+') matchesLevel = boss.level >= 75

      return matchesSearch && matchesLevel
    })
  }, [search, levelRange])

  const getLevelColor = (level: number) => {
    if (level >= 75) return 'text-red-400 bg-red-500/10 border-red-500/30'
    if (level >= 60) return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    if (level >= 40) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-6xl mx-auto pt-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>

        <Link
          to="/wiki/raid-bosses/map"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg hover:brightness-110 transition-all"
        >
          <MapIcon className="w-4 h-4" />
          <span>Abrir Radar & Mapa Interativo</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.raidBosses.title', 'Raid Bosses')}
        subtitle={t('wiki.raidBosses.description', 'Localização de chefes de raide e coordenadas')}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do boss ou nível..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
            {[
              { id: 'all', label: 'Todos os Níveis' },
              { id: '20-39', label: 'Lv. 20-39' },
              { id: '40-59', label: 'Lv. 40-59' },
              { id: '60-74', label: 'Lv. 60-74' },
              { id: '75+', label: 'Lv. 75+' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLevelRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  levelRange === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bosses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBosses.slice(0, 48).map((boss) => {
            const spawn = boss.spawns?.[0]
            return (
              <div
                key={boss.id}
                className="group p-5 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 hover:border-primary/40 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <Crown className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {boss.name}
                      </h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${getLevelColor(
                        boss.level
                      )}`}
                    >
                      Lv. {boss.level}
                    </span>
                  </div>

                  {spawn && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-mono bg-black/30 p-2 rounded-lg border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        X: {spawn.x}, Y: {spawn.y}, Z: {spawn.z}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <Link
                    to={`/wiki/raid-bosses/map?focus=${boss.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Localizar no mapa</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {filteredBosses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum Raid Boss encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
