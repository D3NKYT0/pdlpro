import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { RefreshCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { inventoryApi, lineageApi, marketplaceApi } from '../services/api'
import type { ApiCharacterListing } from '../services/api'
import { ListingDetail } from '../components/marketplace/ListingDetail'
import { MarketplaceCatalog } from '../components/marketplace/MarketplaceCatalog'
import { MarketplaceSellForm } from '../components/marketplace/MarketplaceSellForm'
import { MarketplaceSalesHistory } from '../components/marketplace/MarketplaceSalesHistory'

export function MarketplacePage() {
  const { user } = useAuth()
  const { t } = useTranslation('panel')
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: ['marketplace'], queryFn: marketplaceApi.catalog })
  const mine = useQuery({ queryKey: ['marketplace-mine'], queryFn: marketplaceApi.mine, enabled: Boolean(user) })
  const characters = useQuery({
    queryKey: ['marketplace-chars'],
    queryFn: () => lineageApi.characters(),
    enabled: Boolean(user),
  })
  const [charId, setCharId] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedListing, setSelectedListing] = useState<ApiCharacterListing | null>(null)
  const [pendingListingId, setPendingListingId] = useState('')
  const [publishing, setPublishing] = useState(false)

  const selectedCharacterEquipment = useQuery({
    queryKey: ['marketplace-character-equipment', charId],
    queryFn: () => inventoryApi.equipment(Number(charId)),
    enabled: Boolean(charId),
  })

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['marketplace'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-mine'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-chars'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ])
  }

  async function onList(event: FormEvent) {
    event.preventDefault()
    if (publishing) return
    setPublishing(true)
    try {
      await marketplaceApi.list({ char_id: Number(charId), price, notes })
      toast.success(t('marketplace.toast.listed'))
      setCharId('')
      setPrice('')
      setNotes('')
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('marketplace.toast.listFailed')))
    } finally {
      setPublishing(false)
    }
  }

  async function buy(id: string) {
    setPendingListingId(id)
    try {
      const updated = await marketplaceApi.buy(id)
      setSelectedListing(updated)
      toast.success(t('marketplace.toast.bought'))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('marketplace.toast.buyFailed')))
    } finally {
      setPendingListingId('')
    }
  }

  async function cancel(id: string) {
    setPendingListingId(id)
    try {
      const updated = await marketplaceApi.cancel(id)
      setSelectedListing(updated)
      toast.success(t('marketplace.toast.cancelled'))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('marketplace.toast.cancelFailed')))
    } finally {
      setPendingListingId('')
    }
  }

  return (
    <div className="marketplace-page">
      <Card className="marketplace-hero">
        <div>
          <span className="panel-eyebrow">{t('marketplace.hero.eyebrow')}</span>
          <h1>{t('marketplace.hero.title')}</h1>
          <p className="muted">{t('marketplace.hero.subtitle')}</p>
        </div>
        <Button className="ghost" type="button" onClick={() => void refresh()}>
          <RefreshCcw aria-hidden="true" /> {t('marketplace.refresh')}
        </Button>
      </Card>

      <Card className="marketplace-catalog-card">
        <div className="marketplace-section-heading">
          <div>
            <span className="panel-eyebrow">{t('marketplace.catalog.eyebrow')}</span>
            <h2>{t('marketplace.catalog.title')}</h2>
          </div>
          <span>{t('marketplace.catalog.count', { total: catalog.data?.length ?? 0 })}</span>
        </div>

        {selectedListing ? (
          <ListingDetail
            listing={selectedListing}
            isOwner={Boolean(user && selectedListing.seller_username === user.username)}
            pending={pendingListingId === selectedListing.id}
            onClose={() => setSelectedListing(null)}
            onBuy={(id) => void buy(id)}
            onCancel={(id) => void cancel(id)}
          />
        ) : null}

        <MarketplaceCatalog
          listings={catalog.data ?? []}
          username={user?.username}
          loading={catalog.isLoading}
          onSelect={setSelectedListing}
        />
      </Card>

      {user ? (
        <aside className="marketplace-side-column">
          <MarketplaceSellForm
            characters={characters.data ?? []}
            charId={charId}
            price={price}
            notes={notes}
            publishing={publishing}
            equipmentLoading={selectedCharacterEquipment.isLoading}
            equipment={selectedCharacterEquipment.data ?? []}
            onCharChange={setCharId}
            onPriceChange={setPrice}
            onNotesChange={setNotes}
            onSubmit={(event) => void onList(event)}
          />
          <MarketplaceSalesHistory
            listings={mine.data ?? []}
            loading={mine.isLoading}
            pendingListingId={pendingListingId}
            onView={setSelectedListing}
            onCancel={(id) => void cancel(id)}
          />
        </aside>
      ) : (
        <Card className="marketplace-auth-card">
          <p className="muted">{t('marketplace.authRequired')}</p>
        </Card>
      )}
    </div>
  )
}
