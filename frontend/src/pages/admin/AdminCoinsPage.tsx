import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeDollarSign, Coins, Percent, Scale } from 'lucide-react'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import { ItemIdField } from '../../components/ItemIdField'
import { useItemCatalog } from '../../lib/item-icons'

export function AdminCoinsPage() {
  const catalog = useItemCatalog()
  const queryClient = useQueryClient()
  const coins = useQuery({ queryKey: ['staff-coins'], queryFn: staffApi.coins })
  const [name, setName] = useState('Adena')
  const [coinId, setCoinId] = useState('57')
  const [multiplier, setMultiplier] = useState('1.00')
  const [usd, setUsd] = useState('5.00')
  const [fee, setFee] = useState('0.00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!coins.data) return
    setName(coins.data.name)
    setCoinId(String(coins.data.coin_id))
    setMultiplier(coins.data.multiplier)
    setUsd(coins.data.usd_multiplier)
    setFee(coins.data.withdraw_fee_percent)
  }, [coins.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await staffApi.saveCoins({
        name,
        coin_id: Number(coinId),
        multiplier,
        usd_multiplier: usd,
        withdraw_fee_percent: fee,
        active: true,
      })
      toast.success('Moeda atualizada')
      await queryClient.invalidateQueries({ queryKey: ['staff-coins'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Financeiro" title="Moedas" description="Moeda ativa da carteira e taxas de saque." />
      <form className="admin-coins-form" onSubmit={onSubmit}>
        <section className="card admin-config-section admin-coin-identity">
          <header>
            <span><Coins /></span>
            <div><span className="panel-eyebrow">Moeda principal</span><h2>Identidade da carteira</h2><p>Vincule a moeda virtual ao item correspondente no servidor.</p></div>
          </header>
          <div className="account-form-fields">
            <label className="field">Nome do catálogo XML<input value={catalog.getById(coinId)?.name ?? (coinId ? `Item ${coinId}` : '')} readOnly /><small>O nome vem do item selecionado no catálogo.</small></label>
            <ItemIdField
              value={coinId}
              onChange={(id, item) => {
                setCoinId(id)
                if (item) setName(item.name)
              }}
            />
          </div>
        </section>

        <section className="admin-coin-metrics">
          <label className="card admin-coin-metric field">
            <span className="admin-coin-metric-icon"><Scale /></span>
            <span><b>Multiplicador</b><small>Ajuste global aplicado à moeda</small></span>
            <span className="admin-coin-input"><b>×</b><input type="number" min="0" step="0.01" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></span>
          </label>
          <label className="card admin-coin-metric field">
            <span className="admin-coin-metric-icon"><BadgeDollarSign /></span>
            <span><b>Conversão por USD</b><small>Moedas entregues por dólar</small></span>
            <span className="admin-coin-input"><b>$</b><input type="number" min="0" step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} /></span>
          </label>
          <label className="card admin-coin-metric field">
            <span className="admin-coin-metric-icon"><Percent /></span>
            <span><b>Taxa de retirada</b><small>Percentual retido no saque</small></span>
            <span className="admin-coin-input"><b>%</b><input type="number" min="0" max="100" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></span>
          </label>
        </section>

        <div className="card admin-server-actions">
          <span><strong>Configuração da moeda</strong><small>{name || 'Moeda sem nome'} · Item {coinId || 'não definido'} · taxa de {fee || '0'}%</small></span>
          <AdminSaveBar saving={saving} />
        </div>
      </form>
    </div>
  )
}
