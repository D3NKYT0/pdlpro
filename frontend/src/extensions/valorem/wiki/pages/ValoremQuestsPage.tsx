import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ScrollText, ArrowLeft, Search, Sparkles, BookOpen } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'

interface QuestItem {
  id: number
  name: string
  level: string
  race: string
  reward: string
  repeatable: boolean
}

const COMMON_QUESTS: QuestItem[] = [
  { id: 1, name: 'Letters of Love', level: '2+', race: 'Human', reward: 'Necklace of Knowledge, 687 XP', repeatable: false },
  { id: 2, name: 'What Women Want', level: '2+', race: 'Elf', reward: 'Mystic Earrings, 450 XP', repeatable: false },
  { id: 3, name: 'Release Darkelf Elder', level: '16+', race: 'Dark Elf', reward: 'Onyx Beast Eye, 5670 XP', repeatable: false },
  { id: 101, name: 'Sword of Gathering', level: '10+', race: 'All', reward: 'Sword of Gathering, 3200 XP', repeatable: false },
  { id: 104, name: 'Spirit of Mirrors', level: '10+', race: 'Human', reward: 'Wand of Adept, 3974 XP', repeatable: false },
  { id: 211, name: 'Trial of the Challenger', level: '35+', race: 'All', reward: 'Mark of Challenger (3-in-1)', repeatable: false },
  { id: 212, name: 'Trial of Duty', level: '35+', race: 'Knight', reward: 'Mark of Duty (3-in-1)', repeatable: false },
  { id: 213, name: 'Trial of the Seeker', level: '35+', race: 'Rogue', reward: 'Mark of Seeker (3-in-1)', repeatable: false },
  { id: 214, name: 'Trial of the Scholar', level: '35+', race: 'Wizard', reward: 'Mark of Scholar (3-in-1)', repeatable: false },
  { id: 215, name: 'Trial of the Pilgrim', level: '35+', race: 'Cleric', reward: 'Mark of Pilgrim (3-in-1)', repeatable: false },
  { id: 221, name: 'Testimony of Trust', level: '37+', race: 'All', reward: 'Mark of Trust (3-in-1)', repeatable: false },
  { id: 231, name: 'Test of the Champion', level: '39+', race: 'Warrior', reward: 'Mark of Champion (3-in-1)', repeatable: false },
  { id: 232, name: 'Test of the Lord', level: '39+', race: 'Orc', reward: 'Mark of Lord (3-in-1)', repeatable: false },
  { id: 334, name: 'The Wish Potion', level: '30+', race: 'All', reward: 'Wish Potion (Secret Rewards)', repeatable: true },
  { id: 336, name: 'Coin of Magic', level: '40+', race: 'All', reward: 'Coins of Magic exchange', repeatable: true },
  { id: 373, name: 'Supplier of Reagents', level: '57+', race: 'All', reward: 'Reagents / Pure Silver (Subclass)', repeatable: true },
  { id: 501, name: 'Fate\'s Whisper', level: '75+', race: 'All', reward: 'Pipette Knife, Star of Destiny (Subclass)', repeatable: false },
  { id: 503, name: 'Possessor of a Precious Soul', level: '75+', race: 'All', reward: 'Noblesse Tiara, Noblesse Status', repeatable: false },
]

export function ValoremQuestsPage() {
  const { t } = useTranslation('ext.valorem')
  const [search, setSearch] = useState('')

  const filteredQuests = useMemo(() => {
    if (!search.trim()) return COMMON_QUESTS
    const term = search.toLowerCase()
    return COMMON_QUESTS.filter(
      (q) => q.name.toLowerCase().includes(term) || q.race.toLowerCase().includes(term)
    )
  }, [search])

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
        title={t('wiki.quests.title', 'Missões & Guias de Quests')}
        subtitle={t('wiki.quests.description', 'Recompensas, mudança de classe e nobreza')}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da quest ou raça..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Quests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuests.map((quest) => (
            <div
              key={quest.id}
              className="p-5 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 transition-all flex flex-col justify-between shadow-sm group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <ScrollText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {quest.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Raça: <strong className="text-foreground">{quest.race}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-white/5 text-primary font-mono text-xs font-bold border border-white/10">
                    Lv. {quest.level}
                  </span>
                </div>

                <div className="mt-4 p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recompensa:</span>
                  </div>
                  <span>{quest.reward}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
