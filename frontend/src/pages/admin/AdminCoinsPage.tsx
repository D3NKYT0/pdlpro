import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'
import { ItemIdField } from '../../components/ItemIdField'

export function AdminCoinsPage() {
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
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="account-form-fields">
          <label className="field">Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <ItemIdField
            value={coinId}
            onChange={(id, item) => {
              setCoinId(id)
              if (item) setName(item.name)
            }}
          />
        </div>
        <div className="account-form-fields">
          <label className="field">Multiplicador<input value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></label>
          <label className="field">Moedas por USD<input value={usd} onChange={(e) => setUsd(e.target.value)} /></label>
        </div>
        <label className="field">Taxa de retirada (%)<input value={fee} onChange={(e) => setFee(e.target.value)} /></label>
        <AdminSaveBar saving={saving} />
      </form>
    </div>
  )
}
