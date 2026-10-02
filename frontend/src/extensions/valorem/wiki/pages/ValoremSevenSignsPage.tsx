import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, Info, Trophy, Shield, Coins, ArrowLeft, Sparkles } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'

export function ValoremSevenSignsPage() {
  const { t } = useTranslation('ext.valorem')

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-16 px-4">
      <div className="max-w-5xl mx-auto pt-6">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>

      <SectionTitle
        title={t('wiki.categories.sevenSigns', 'Seven Signs & Mammon')}
        subtitle={t('wiki.categories.sevenSignsDesc', 'Guia do ciclo dos 7 selos, Catacumbas, Necrópoles e Mammon')}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cycle Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card/60 p-6 rounded-xl border border-white/10 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex items-center gap-3 text-amber-400">
              <Trophy className="w-5 h-5" />
              <h3 className="font-bold text-base text-foreground">Lords of Dawn</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aliança apoiada por jogadores de clãs que possuem castelos ou pagam taxa de adesão em Adena.
              Vencer o ciclo concede acesso exclusivo às Necrópoles e Catacumbas e libera os comerciantes de Mammon.
            </p>
          </div>

          <div className="bg-card/60 p-6 rounded-xl border border-white/10 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex items-center gap-3 text-purple-400">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold text-base text-foreground">Revolutionaries of Dusk</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aliança aberta para todos os jogadores sem castelo. Se o Dusk vencer, os castelos perdem benefícios
              e as taxas do reino são alteradas em favor dos rebeldes.
            </p>
          </div>
        </div>

        {/* Mammon Guide */}
        <div className="bg-card/60 p-6 rounded-xl border border-white/10 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-lg text-foreground">Blacksmith & Merchant of Mammon</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Durante o período de validação do selo (quando uma facção vence com mais de 35% das Seal Stones):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Blacksmith of Mammon</span>
              </h4>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>Adiciona e remove Efeitos Especiais (SA) em armas Grade A e S sem custo de Soul Crystal.</li>
                <li>Remove o selo (Unseal) de armaduras e joias Grade A e S.</li>
                <li>Troca armas por outras do mesmo tier (ex: Sword of Miracles por Keshanberk).</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Merchant of Mammon</span>
              </h4>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>Vende pergaminhos de enchant (Enchant Scroll) por Ancient Adena.</li>
                <li>Vende Gemstones A e S e Dual Craft Stamps.</li>
                <li>Converte Seal Stones (Blue, Green, Red) em Ancient Adena.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
