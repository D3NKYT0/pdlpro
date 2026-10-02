import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  GraduationCap,
  Sword,
  Zap,
  Target,
  Shield,
  Heart,
  ArrowLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import {
  CLASS_NAMES,
  getClassRace,
  getClassRole,
  getClassTier,
  getClassEvolution,
  type ClassRole,
} from '../lib/class-data'

const RACES = [
  { id: 'all', name: 'Todas as Raças' },
  { id: 'human', name: 'Human' },
  { id: 'elf', name: 'Elf' },
  { id: 'dark_elf', name: 'Dark Elf' },
  { id: 'orc', name: 'Orc' },
  { id: 'dwarf', name: 'Dwarf' },
]

const ROLES: { id: string; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'Todas as Funções', icon: GraduationCap, color: 'text-foreground' },
  { id: 'warrior', label: 'Warrior', icon: Sword, color: 'text-pink-400' },
  { id: 'wizard', label: 'Wizard', icon: Zap, color: 'text-purple-400' },
  { id: 'rogue', label: 'Rogue', icon: Target, color: 'text-emerald-400' },
  { id: 'knight', label: 'Knight', icon: Shield, color: 'text-blue-400' },
  { id: 'support', label: 'Support', icon: Heart, color: 'text-amber-400' },
]

export function ValoremClassesPage() {
  const { t } = useTranslation('ext.valorem')
  const [selectedRace, setSelectedRace] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [activeClassId, setActiveClassId] = useState<number | null>(null)

  const allClassIds = useMemo(() => {
    return Object.keys(CLASS_NAMES).map(Number)
  }, [])

  const filteredClasses = useMemo(() => {
    return allClassIds.filter((id) => {
      const name = CLASS_NAMES[id] || ''
      const race = getClassRace(id)
      const role = getClassRole(id)
      const tier = getClassTier(id)

      const matchesSearch =
        !search.trim() || name.toLowerCase().includes(search.toLowerCase())
      const matchesRace = selectedRace === 'all' || race === selectedRace
      const matchesRole = selectedRole === 'all' || role === selectedRole
      const matchesTier = selectedTier === 'all' || String(tier) === selectedTier

      return matchesSearch && matchesRace && matchesRole && matchesTier
    })
  }, [allClassIds, search, selectedRace, selectedRole, selectedTier])

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
        title={t('wiki.classes.title', 'Classes & Evolução')}
        subtitle={t('wiki.classes.description', 'Consulte caminhos de mudança de classe e atributos')}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Filters */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar classe..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between border-t border-white/5 pt-3">
            {/* Race Filter */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase mr-1">Raça:</span>
              {RACES.map((race) => (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => setSelectedRace(race.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    selectedRace === race.id
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {race.name}
                </button>
              ))}
            </div>

            {/* Tier Filter */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase mr-1">Grau:</span>
              {[
                { id: 'all', name: 'Todos' },
                { id: '0', name: 'Base' },
                { id: '1', name: '1st Class' },
                { id: '2', name: '2nd Class' },
                { id: '3', name: '3rd Class' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    selectedTier === tier.id
                      ? 'bg-amber-500 text-black font-semibold'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {tier.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredClasses.map((id) => {
            const name = CLASS_NAMES[id]
            const race = getClassRace(id)
            const role = getClassRole(id) as ClassRole
            const tier = getClassTier(id)
            const evolution = getClassEvolution(id)
            const isSelected = activeClassId === id

            return (
              <div
                key={id}
                onClick={() => setActiveClassId(isSelected ? null : id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-card border-primary ring-2 ring-primary/20'
                    : 'bg-card/60 hover:bg-card/90 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {tier}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-tight">{name}</h4>
                      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {race.replace('_', ' ')} • {role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evolution Path when clicked */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs">
                    <p className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                      Caminho de Evolução:
                    </p>
                    <div className="flex flex-wrap items-center gap-1 text-muted-foreground font-medium">
                      {evolution.map((evId, idx) => (
                        <span key={evId} className="flex items-center gap-1">
                          <span className={evId === id ? 'text-primary font-bold underline' : ''}>
                            {CLASS_NAMES[evId]}
                          </span>
                          {idx < evolution.length - 1 && <ChevronRight className="w-3 h-3 text-white/40" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma classe encontrada com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
