import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RefreshCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { auctionApi, inventoryApi, lineageApi } from '../services/api'
import type { ApiAuction } from '../services/api'
import { AuctionDetail } from '../components/auction/AuctionDetail'
import { AuctionOpenList } from '../components/auction/AuctionOpenList'
import { AuctionCreateForm } from '../components/auction/AuctionCreateForm'
import { AuctionHistory } from '../components/auction/AuctionHistory'
import { nextBidFor } from '../components/auction/auctionHelpers'

export function AuctionPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const open = useQuery({ queryKey: ['auctions'], queryFn: auctionApi.open })
  const mine = useQuery({ queryKey: ['auctions-mine'], queryFn: auctionApi.mine, enabled: Boolean(user) })
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.dashboard(),
    enabled: Boolean(user),
  })
  const characters = useQuery({
    queryKey: ['auction-characters'],
    queryFn: () => lineageApi.characters(),
    enabled: Boolean(user),
  })
  const [inventoryId, setInventoryId] = useState('')
  const [itemKey, setItemKey] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [minBid, setMinBid] = useState('')
  const [hours, setHours] = useState('24')
  const [selectedAuctionId, setSelectedAuctionId] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const [bidCharacter, setBidCharacter] = useState('')
  const [creating, setCreating] = useState(false)
  const [bidding, setBidding] = useState(false)

  const selectedInventory = (inventory.data ?? []).find((row) => row.inventory_id === inventoryId)
  const selectedItem = (selectedInventory?.items ?? []).find(
    (item) => `${item.item_id}:${item.enchant}` === itemKey,
  )
  const selectedAuction = [...(open.data ?? []), ...(mine.data ?? [])].find(
    (auction) => auction.id === selectedAuctionId,
  )

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auctions'] }),
      queryClient.invalidateQueries({ queryKey: ['auctions-mine'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    ])
  }

  function viewAuction(auction: ApiAuction) {
    setSelectedAuctionId(auction.id)
    setBidAmount(nextBidFor(auction))
    if (!bidCharacter && characters.data?.length === 1) setBidCharacter(characters.data[0].name)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!selectedItem) return
    setCreating(true)
    try {
      const created = await auctionApi.create({
        inventory_id: inventoryId,
        item_id: selectedItem.item_id,
        quantity: Number(quantity),
        enchant: selectedItem.enchant,
        min_bid: minBid,
        hours: Number(hours),
      })
      toast.success('Leilão criado')
      setSelectedAuctionId(created.id)
      setInventoryId('')
      setItemKey('')
      setQuantity('1')
      setMinBid('')
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível criar o leilão'))
    } finally {
      setCreating(false)
    }
  }

  async function onBid(event: FormEvent, auctionId: string) {
    event.preventDefault()
    setBidding(true)
    try {
      await auctionApi.bid(auctionId, bidAmount, bidCharacter)
      toast.success('Lance enviado')
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Lance recusado'))
    } finally {
      setBidding(false)
    }
  }

  return (
    <div className="marketplace-page auction-page">
      <Card className="marketplace-hero auction-hero">
        <div>
          <span className="panel-eyebrow">Negociação de itens</span>
          <h1>Leilões</h1>
          <p className="muted">Confira o item, acompanhe os lances e escolha quem receberá o prêmio.</p>
        </div>
        <Button className="ghost" type="button" onClick={() => void refresh()}>
          <RefreshCcw aria-hidden="true" /> Atualizar
        </Button>
      </Card>

      <Card className="marketplace-catalog-card auction-catalog-card">
        <div className="marketplace-section-heading">
          <div>
            <span className="panel-eyebrow">Itens disponíveis</span>
            <h2>Leilões abertos</h2>
          </div>
          <span>{open.data?.length ?? 0} anúncios</span>
        </div>

        {selectedAuction ? (
          <AuctionDetail
            auction={selectedAuction}
            isOwner={Boolean(user && selectedAuction.seller_username === user.username)}
            bidAmount={bidAmount}
            bidCharacter={bidCharacter}
            characters={characters.data ?? []}
            pending={bidding}
            onAmountChange={setBidAmount}
            onCharacterChange={setBidCharacter}
            onClose={() => setSelectedAuctionId('')}
            onBid={(event, auctionId) => void onBid(event, auctionId)}
          />
        ) : null}

        <AuctionOpenList
          auctions={open.data ?? []}
          username={user?.username}
          loading={open.isLoading}
          onSelect={viewAuction}
        />
      </Card>

      {user ? (
        <aside className="marketplace-side-column auction-side-column">
          <AuctionCreateForm
            inventory={inventory.data ?? []}
            inventoryId={inventoryId}
            itemKey={itemKey}
            quantity={quantity}
            minBid={minBid}
            hours={hours}
            creating={creating}
            onInventoryChange={(value) => {
              setInventoryId(value)
              setItemKey('')
              setQuantity('1')
            }}
            onItemChange={(value) => {
              setItemKey(value)
              setQuantity('1')
            }}
            onQuantityChange={setQuantity}
            onMinBidChange={setMinBid}
            onHoursChange={setHours}
            onSubmit={(event) => void onCreate(event)}
          />
          <AuctionHistory
            auctions={mine.data ?? []}
            loading={mine.isLoading}
            onView={viewAuction}
          />
        </aside>
      ) : (
        <Card className="marketplace-auth-card">
          <p className="muted">Entre para criar leilões ou dar lances.</p>
        </Card>
      )}
    </div>
  )
}
