import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sword,
  ScrollText,
  Users,
  MapPin,
  GraduationCap,
  Zap,
  Crown,
  Clock,
  Terminal,
  Calculator,
  Compass,
} from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { MotionWrapper } from '../components/MotionWrapper'

export function ValoremWikiHomePage() {
  const { t } = useTranslation('ext.valorem')

  const categories = [
    {
      to: '/wiki/items',
      icon: Sword,
      title: t('wiki.categories.items', 'Itens e Equipamentos'),
      description: t('wiki.categories.itemsDesc', 'Armas, armaduras, joias e consumíveis'),
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
    },
    {
      to: '/wiki/npcs',
      icon: Users,
      title: t('wiki.categories.npcs', 'Monstros & NPCs'),
      description: t('wiki.categories.npcsDesc', 'Estatísticas, droplist e spoil'),
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
    },
    {
      to: '/wiki/raid-bosses',
      icon: Crown,
      title: t('wiki.raidBosses.title', 'Raid Bosses'),
      description: t('wiki.raidBosses.description', 'Chefes de raide e mapa interativo'),
      color: 'from-red-500/20 to-orange-500/20',
      iconColor: 'text-red-400',
    },
    {
      to: '/wiki/locations',
      icon: MapPin,
      title: t('wiki.locations.title', 'Localizações'),
      description: t('wiki.locations.description', 'Cidades, regiões de caça e zonas seguras'),
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
    },
    {
      to: '/wiki/quests',
      icon: ScrollText,
      title: t('wiki.quests.title', 'Missões & Quests'),
      description: t('wiki.quests.description', 'Guias de troca de classe e recompensas'),
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
    },
    {
      to: '/wiki/enchant-bonus',
      icon: Sword,
      title: 'Enchant Bonuses',
      description: 'Bônus de conjuntos D/C/B/A/S e HP',
      color: 'from-rose-500/20 to-red-600/20',
      iconColor: 'text-rose-400',
    },
    {
      to: '/wiki/classes',
      icon: GraduationCap,
      title: t('wiki.classes.title', 'Classes & Evolução'),
      description: t('wiki.classes.description', 'Árvore genealógica e atributos por nível'),
      color: 'from-indigo-500/20 to-violet-500/20',
      iconColor: 'text-indigo-400',
    },
    {
      to: '/wiki/skills',
      icon: Zap,
      title: t('wiki.skills.title', 'Habilidades & Magias'),
      description: t('wiki.skills.description', 'Lista completa de skills ativas e passivas'),
      color: 'from-cyan-500/20 to-blue-600/20',
      iconColor: 'text-cyan-400',
    },
    {
      to: '/wiki/stamina',
      icon: Clock,
      title: t('wiki.categories.stamina', 'Calculadora de Estamina'),
      description: t('wiki.categories.staminaDesc', 'Planeje seu tempo de jogo e bônus de EXP'),
      color: 'from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-400',
    },
    {
      to: '/wiki/commands',
      icon: Terminal,
      title: t('wiki.categories.commands', 'Comandos do Jogo'),
      description: t('wiki.categories.commandsDesc', 'Comandos úteis (.menu, .lock, .repair)'),
      color: 'from-slate-500/20 to-gray-500/20',
      iconColor: 'text-slate-400',
    },
    {
      to: '/wiki/craft-calculator',
      icon: Calculator,
      title: t('wiki.categories.calculator', 'Calculadora de Craft'),
      description: t('wiki.categories.calculatorDesc', 'Desdobramento de receitas e materiais'),
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      to: '/wiki/seven-signs',
      icon: Compass,
      title: t('wiki.categories.sevenSigns', 'Seven Signs'),
      description: t('wiki.categories.sevenSignsDesc', 'Ciclo dos selos, catacumbas e necrópoles'),
      color: 'from-sky-500/20 to-blue-500/20',
      iconColor: 'text-sky-400',
    },
  ]

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16">
      <MotionWrapper>
        <SectionTitle
          title={t('wiki.title', 'Enciclopédia & Wiki Valorem')}
          subtitle={t('wiki.meta_title', 'Base de dados oficial do servidor')}
        />
      </MotionWrapper>

      <section className="relative px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-base md:text-lg text-muted-foreground">
            {t('wiki.description', 'Explore estatísticas, itens, montagens de receitas, raid bosses e guias atualizados.')}
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.to}
                to={category.to}
                className="group relative flex flex-col justify-between p-6 rounded-xl border border-white/10 bg-card/60 hover:bg-card/90 hover:border-primary/50 transition-all shadow-md hover:shadow-xl overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background/80 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <category.icon className={`w-6 h-6 ${category.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
