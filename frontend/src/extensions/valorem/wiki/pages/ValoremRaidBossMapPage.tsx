import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Crown, MapPin, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import bossesData from '../../data/raid-bosses.json'

/**
 * Lineage 2 Interlude coordinate to 2D canvas/map percentage normalization:
 * Map spans roughly X: -130,000 to +230,000, Y: -120,000 to +260,000
 */
function normalizeL2Coords(x: number, y: number): { xPercent: number; yPercent: number } {
  const minX = -131072
  const maxX = 228800
  const minY = -120000
  const maxY = 262144

  const xPercent = Math.max(5, Math.min(95, ((x - minX) / (maxX - minX)) * 100))
  const yPercent = Math.max(5, Math.min(95, ((y - minY) / (maxY - minY)) * 100))
  return { xPercent, yPercent }
}

export function ValoremRaidBossMapPage() {
  const [searchParams] = useSearchParams()
  const initialFocus = searchParams.get('focus')

  const [selectedBoss, setSelectedBoss] = useState<any>(
    () => (bossesData as any[]).find((b) => b.id === initialFocus) || (bossesData as any[])[0]
  )
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(1)

  const bosses = useMemo(() => {
    return (bossesData as any[]).filter((b) => {
      if (!search.trim()) return true
      return b.name.toLowerCase().includes(search.toLowerCase()) || String(b.level).includes(search)
    })
  }, [search])

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-7xl mx-auto pt-6 flex items-center justify-between">
        <Link
          to="/wiki/raid-bosses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Bosses</span>
        </Link>
      </div>

      <SectionTitle
        title="Radar & Mapa de Raid Bosses"
        subtitle="Visualização interativa das zonas de spawn do Lineage 2"
      />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Boss List with search */}
        <div className="lg:col-span-1 bg-card/60 border border-white/10 rounded-xl p-4 flex flex-col h-[650px] shadow-lg">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar boss..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {bosses.map((boss) => {
              const isSelected = selectedBoss?.id === boss.id
              return (
                <button
                  key={boss.id}
                  type="button"
                  onClick={() => setSelectedBoss(boss)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow'
                      : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="truncate pr-2">{boss.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-black/20 text-white' : 'bg-white/5 text-primary'
                    }`}
                  >
                    Lv.{boss.level}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Side: Radar / Interactive Map Area */}
        <div className="lg:col-span-3 flex flex-col h-[650px] bg-card/60 border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-black/60 p-1.5 rounded-lg border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-2 hover:bg-white/10 rounded text-foreground transition-colors"
              title="Aproximar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="p-2 hover:bg-white/10 rounded text-foreground transition-colors"
              title="Afastar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 hover:bg-white/10 rounded text-foreground transition-colors"
              title="Redefinir"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Map canvas */}
          <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center select-none">
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />

            {/* Scaled interactive layer */}
            <div
              className="relative w-full h-full transition-transform duration-300 origin-center"
              style={{ transform: `scale(${zoom})` }}
            >
              {bosses.map((boss) => {
                const spawn = boss.spawns?.[0]
                if (!spawn) return null
                const { xPercent, yPercent } = normalizeL2Coords(spawn.x, spawn.y)
                const isSelected = selectedBoss?.id === boss.id

                return (
                  <button
                    key={boss.id}
                    type="button"
                    onClick={() => setSelectedBoss(boss)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                    style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                    title={`${boss.name} (Lv. ${boss.level})`}
                  >
                    <div
                      className={`relative rounded-full transition-all flex items-center justify-center ${
                        isSelected
                          ? 'w-7 h-7 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.9)] ring-4 ring-red-400/40 z-30 scale-125'
                          : 'w-4 h-4 bg-primary/80 hover:bg-red-400 text-primary-foreground hover:scale-125 z-10'
                      }`}
                    >
                      <Crown className={isSelected ? 'w-4 h-4' : 'w-2.5 h-2.5'} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom Info Bar for selected boss */}
          {selectedBoss && (
            <div className="p-4 bg-background/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{selectedBoss.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                      Lv. {selectedBoss.level}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    ID: <span className="font-mono text-foreground">{selectedBoss.id}</span>
                  </p>
                </div>
              </div>

              {selectedBoss.spawns?.[0] && (
                <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-xs text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    X: <strong className="text-foreground">{selectedBoss.spawns[0].x}</strong>, Y:{' '}
                    <strong className="text-foreground">{selectedBoss.spawns[0].y}</strong>, Z:{' '}
                    <strong className="text-foreground">{selectedBoss.spawns[0].z}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
