import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shield, Sparkles } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { getLocalizedEnchantData } from '../lib/wiki-enchant-service'

export function ValoremEnchantBonusPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith('pt') ? 'pt' : i18n.language?.startsWith('es') ? 'es' : 'en'

  const [activeGrade, setActiveGrade] = useState<'d' | 'c' | 'b' | 'a_s' | 'hp'>('d')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    getLocalizedEnchantData(lang).then(setData)
  }, [lang])

  const labels = {
    pt: {
      title: 'Bônus de Encantamento',
      subtitle: 'Conjuntos e armaduras Grade D, C, B, A e S',
      enchant: 'Nível',
      heavy: 'Armadura Pesada (Heavy)',
      light: 'Armadura Leve (Light)',
      robe: 'Toga Mágica (Robe)',
      tabD: 'Grade D',
      tabC: 'Grade C',
      tabB: 'Grade B',
      tabAS: 'Grade A / S',
      tabHP: 'Aumento de HP',
      armorType: 'Grade / Tipo de Armadura',
    },
    es: {
      title: 'Bonos de Encantamiento',
      subtitle: 'Conjuntos y armaduras Grado D, C, B, A y S',
      enchant: 'Nivel',
      heavy: 'Armadura Pesada (Heavy)',
      light: 'Armadura Ligera (Light)',
      robe: 'Túnica Mágica (Robe)',
      tabD: 'Grado D',
      tabC: 'Grado C',
      tabB: 'Grado B',
      tabAS: 'Grado A / S',
      tabHP: 'Aumento de HP',
      armorType: 'Grado / Tipo de Armadura',
    },
    en: {
      title: 'Enchantment Bonuses',
      subtitle: 'D, C, B, A, and S Grade armor set effects',
      enchant: 'Enchant',
      heavy: 'Heavy Armor',
      light: 'Light Armor',
      robe: 'Robe Armor',
      tabD: 'D Grade',
      tabC: 'C Grade',
      tabB: 'B Grade',
      tabAS: 'A / S Grade',
      tabHP: 'HP Increase',
      armorType: 'Grade / Armor Type',
    },
  }[lang]

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

      <SectionTitle title={labels.title} subtitle={labels.subtitle} />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
          {(['d', 'c', 'b', 'a_s', 'hp'] as const).map((key) => {
            const tabName =
              key === 'd'
                ? labels.tabD
                : key === 'c'
                ? labels.tabC
                : key === 'b'
                ? labels.tabB
                : key === 'a_s'
                ? labels.tabAS
                : labels.tabHP

            const isActive = activeGrade === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveGrade(key)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-card/60 hover:bg-card border border-white/10 text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabName}
              </button>
            )
          })}
        </div>

        {/* Content Table */}
        {!data ? (
          <div className="text-center py-16 text-muted-foreground">Carregando bônus...</div>
        ) : activeGrade === 'hp' ? (
          <div className="rounded-xl border border-white/10 bg-card/60 overflow-hidden shadow-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="p-4">{labels.armorType}</th>
                  {data.hpIncrease.headers.map((h: string) => (
                    <th key={h} className="p-4 text-center font-mono">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.hpIncrease.rows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      <span className="text-primary font-bold mr-2">[{row.grade}]</span>
                      {row.type}
                    </td>
                    {data.hpIncrease.headers.map((h: string) => (
                      <td key={h} className="p-4 text-center font-mono text-emerald-400 font-medium">
                        +{row.values[h] || '0'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-card/60 overflow-hidden shadow-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="p-4 w-28 text-center">{labels.enchant}</th>
                  <th className="p-4">{labels.heavy}</th>
                  <th className="p-4">{labels.light}</th>
                  <th className="p-4">{labels.robe}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data[activeGrade] || []).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-center font-mono font-bold text-amber-400 bg-black/20">
                      {row.enchant}
                    </td>
                    <td className="p-4 text-xs md:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                      {row.heavy || '-'}
                    </td>
                    <td className="p-4 text-xs md:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                      {row.light || '-'}
                    </td>
                    <td className="p-4 text-xs md:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                      {row.robe || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
