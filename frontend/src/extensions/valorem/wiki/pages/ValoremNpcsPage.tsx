import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Search, ArrowLeft, Skull, Shield, User, ShoppingBag } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'

interface NpcItem {
  id: number
  name: string
  type: string
  level: number
  location?: string
}

const COMMON_NPCS: NpcItem[] = [
  { id: 20001, name: 'Gremlin', type: 'monster', level: 1, location: 'Talking Island' },
  { id: 20003, name: 'Goblin', type: 'monster', level: 4, location: 'Talking Island' },
  { id: 20006, name: 'Wolf', type: 'monster', level: 9, location: 'Elven Village' },
  { id: 20014, name: 'Orc Grunt', type: 'monster', level: 14, location: 'Gludio Territory' },
  { id: 20025, name: 'Skeleton Warrior', type: 'monster', level: 25, location: 'Ruins of Despair' },
  { id: 20035, name: 'Ol Mahum Patrol', type: 'monster', level: 35, location: 'Wasteland' },
  { id: 20048, name: 'Timak Orc Troop Leader', type: 'monster', level: 45, location: 'Oren Territory' },
  { id: 20055, name: 'Grave Guard', type: 'monster', level: 55, location: 'Dragon Valley' },
  { id: 20068, name: 'Malruk Knight', type: 'monster', level: 66, location: 'Antharas Lair' },
  { id: 20078, name: 'Cave Maiden', type: 'monster', level: 75, location: 'Antharas Lair' },
  { id: 20085, name: 'Bloody Lord', type: 'monster', level: 80, location: 'Forge of the Gods' },
  { id: 30001, name: 'Gatekeeper Roxxy', type: 'npc', level: 70, location: 'Talking Island' },
  { id: 30003, name: 'High Priest Biotin', type: 'npc', level: 70, location: 'Talking Island' },
  { id: 30006, name: 'Warehouse Keeper Wilford', type: 'npc', level: 70, location: 'Gludin' },
  { id: 30010, name: 'Blacksmith Pinter', type: 'npc', level: 70, location: 'Gludio' },
  { id: 30017, name: 'Grocer Sara', type: 'merchant', level: 70, location: 'Dion' },
  { id: 30030, name: 'Captain Lucas', type: 'guard', level: 70, location: 'Dion' },
  { id: 30080, name: 'Adventure Guildsman', type: 'npc', level: 70, location: 'All Towns' },
]

export function ValoremNpcsPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const filteredNpcs = useMemo(() => {
    return COMMON_NPCS.filter((npc) => {
      const matchesSearch =
        !search.trim() ||
        npc.name.toLowerCase().includes(search.toLowerCase()) ||
        String(npc.id).includes(search)
      const matchesType = selectedType === 'all' || npc.type === selectedType

      return matchesSearch && matchesType
    })
  }, [search, selectedType])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'monster':
        return <Skull className="w-4 h-4 text-red-400" />
      case 'merchant':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />
      case 'guard':
        return <Shield className="w-4 h-4 text-blue-400" />
      default:
        return <User className="w-4 h-4 text-emerald-400" />
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
        title={t('wiki.categories.npcs', 'Monstros & NPCs')}
        subtitle={t('wiki.categories.npcsDesc', 'Estatísticas, droplist e locais de spawn')}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Filters */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou ID do monstro..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'monster', label: 'Monstros' },
              { id: 'npc', label: 'NPCs' },
              { id: 'merchant', label: 'Comerciantes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  selectedType === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* NPCs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredNpcs.map((npc) => (
            <div
              key={npc.id}
              className="p-4 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 transition-all flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  {getTypeIcon(npc.type)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {npc.name}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {npc.id} • {npc.location || 'Aden'}
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-white/5 text-muted-foreground font-mono text-xs font-bold border border-white/10">
                Lv. {npc.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
