import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Terminal, Lock, RotateCcw, Package, Info, Zap, Shield, ArrowLeft } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'

export function ValoremCommandsPage() {
  const { t } = useTranslation('ext.valorem')

  const commands = [
    {
      name: '.menu',
      desc: t('wiki.commands_page.menu_desc', 'Abre o painel principal de configurações e preferências do personagem.'),
      icon: Terminal,
    },
    {
      name: '.lock',
      desc: t('wiki.commands_page.lock_desc', 'Bloqueia o personagem temporariamente com senha de segurança contra acessos indevidos.'),
      icon: Lock,
    },
    {
      name: '.repair',
      desc: t('wiki.commands_page.repair_desc', 'Repara um personagem travado enviando-o para a cidade principal mais próxima.'),
      icon: RotateCcw,
    },
    {
      name: '.autoloot',
      desc: t('wiki.commands_page.autoloot_desc', 'Alterna o recolhimento automático de drops para o inventário.'),
      icon: Package,
    },
    {
      name: '.expoff',
      desc: t('wiki.commands_page.expoff_desc', 'Bloqueia o ganho de experiência (EXP) do personagem.'),
      icon: Info,
    },
    {
      name: '.expon',
      desc: t('wiki.commands_page.expon_desc', 'Reativa o ganho de experiência normal.'),
      icon: Zap,
    },
    {
      name: '.whoami',
      desc: t('wiki.commands_page.whoami_desc', 'Exibe atributos detalhados, resistências e status avançados de combate.'),
      icon: Shield,
    },
  ]

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-4xl mx-auto pt-6">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.categories.commands', 'Comandos do Servidor')}
        subtitle={t('wiki.commands_page.title', 'Atalhos no chat do jogo')}
      />

      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-sm overflow-hidden shadow-lg">
          <div className="divide-y divide-white/10">
            {commands.map((cmd) => (
              <div
                key={cmd.name}
                className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <cmd.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-lg font-bold text-primary tracking-wide">
                    {cmd.name}
                  </span>
                </div>
                <p className="text-sm md:text-base text-muted-foreground grow">
                  {cmd.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
