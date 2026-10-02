import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Zap, Search, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import skillsDataEn from '../../data/skills_valorem.json'
import skillsDataPt from '../../data/skills_pt_BR.json'

export function ValoremSkillsPage() {
  const { i18n, t } = useTranslation('ext.valorem')
  const isPt = i18n.language?.startsWith('pt')
  const skillsData: Record<string, any> = isPt ? (skillsDataPt as any) : (skillsDataEn as any)

  const [search, setSearch] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 24

  const skillIds = useMemo(() => {
    return Object.keys(skillsData)
  }, [skillsData])

  const filteredSkillIds = useMemo(() => {
    if (!search.trim()) return skillIds
    const term = search.toLowerCase()
    return skillIds.filter((id) => {
      const skill = skillsData[id]
      return id.includes(term) || skill?.name?.toLowerCase().includes(term)
    })
  }, [skillIds, skillsData, search])

  const paginatedIds = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredSkillIds.slice(start, start + pageSize)
  }, [filteredSkillIds, page])

  const totalPages = Math.ceil(filteredSkillIds.length / pageSize)

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
        title={t('wiki.skills.title', 'Habilidades & Magias')}
        subtitle={`${filteredSkillIds.length} habilidades catalogadas`}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search */}
        <div className="bg-card/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome da habilidade ou ID..."
              className="w-full bg-background/50 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedIds.map((id) => {
            const skill = skillsData[id]
            const isSelected = selectedSkillId === id
            const levels = Object.keys(skill.levels || {})
            const maxLevel = levels.length > 0 ? levels[levels.length - 1] : '1'
            const firstDesc = skill.levels?.[maxLevel] || skill.levels?.[1] || ''

            return (
              <div
                key={id}
                onClick={() => setSelectedSkillId(isSelected ? null : id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-md flex flex-col justify-between ${
                  isSelected
                    ? 'bg-card border-primary ring-2 ring-primary/20'
                    : 'bg-card/60 hover:bg-card/90 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{skill.name}</h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {id} • Max Lv. {maxLevel}
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <p className="mt-3 text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                    {firstDesc}
                  </p>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-xs">
                    <p className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                      Descrição completa (Lv. {maxLevel}):
                    </p>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-black/30 p-2.5 rounded-lg border border-white/5">
                      {firstDesc}
                    </p>
                  </div>
                )}
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
