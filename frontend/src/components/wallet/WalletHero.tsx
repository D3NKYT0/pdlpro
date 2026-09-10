import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Coins, Clock3, Landmark, ShieldCheck, Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'

type WalletHeroProps = {
  balance?: string
  bonusBalance?: string
}

export function WalletHero({ balance, bonusBalance }: WalletHeroProps) {
  const { t } = useTranslation('panel')

  return (
    <Card className="wallet-hero">
      <div className="wallet-hero-copy">
        <span className="panel-eyebrow">{t('wallet.hero.eyebrow')}</span>
        <span className="wallet-title-icon" aria-hidden="true">
          <Landmark />
        </span>
        <h1>{t('wallet.hero.title')}</h1>
        <p>{t('wallet.hero.subtitle')}</p>
        <div className="wallet-trust-row">
          <span><ShieldCheck aria-hidden="true" /> {t('wallet.hero.trustPayment')}</span>
          <span><Clock3 aria-hidden="true" /> {t('wallet.hero.trustCredit')}</span>
        </div>
      </div>

      <div className="wallet-hero-aside">
        <div className="wallet-balance-card">
          <span className="wallet-balance-icon" aria-hidden="true"><Coins /></span>
          <div className="wallet-balance-copy">
            <small>{t('wallet.hero.availableBalance')}</small>
            <strong>{balance ?? '0.00'} <span>{t('wallet.hero.coins')}</span></strong>
          </div>
          <Link className="wallet-game-exchange" to="/panel/wallet/game">
            <ArrowUpRight aria-hidden="true" />
            {t('wallet.hero.gameExchange')}
          </Link>
          <div className="wallet-bonus-chip">
            <Sparkles aria-hidden="true" />
            <span>{t('wallet.hero.bonus')}</span>
            <b>{bonusBalance ?? '0.00'}</b>
          </div>
        </div>
      </div>
    </Card>
  )
}
