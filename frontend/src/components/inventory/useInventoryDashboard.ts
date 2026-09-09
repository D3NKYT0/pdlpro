import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/errors'
import { gamesApi, inventoryApi, lineageApi } from '../../services/api'
import type { InventoryTab, PanelItemAction } from './types'

export function useInventoryDashboard() {
  const { t } = useTranslation('panel')
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const bag = useQuery({ queryKey: ['bag'], queryFn: gamesApi.bag })
  const [activeTab, setActiveTab] = useState<InventoryTab>('characters')
  const [selectedLogin, setSelectedLogin] = useState('')
  const primaryLogin = accounts.data?.accounts.find((account) => account.is_primary)?.login
  const fallbackLogin = primaryLogin ?? accounts.data?.accounts[0]?.login ?? ''
  const login = selectedLogin || fallbackLogin
  const dashboard = useQuery({
    queryKey: ['inventory', login],
    queryFn: () => inventoryApi.dashboard(login),
    enabled: Boolean(login),
  })
  const characters = useQuery({
    queryKey: ['characters', login],
    queryFn: () => lineageApi.characters(login),
    enabled: Boolean(login),
  })
  const [charId, setCharId] = useState<number | ''>('')
  const [itemId, setItemId] = useState('57')
  const [quantity, setQuantity] = useState('1')
  const [gameItemSearch, setGameItemSearch] = useState('')
  const [gameItemsPage, setGameItemsPage] = useState(1)
  const [gameItemsPageSize, setGameItemsPageSize] = useState(8)
  const [panelItemAction, setPanelItemAction] = useState<PanelItemAction | null>(null)
  const [panelActionQuantity, setPanelActionQuantity] = useState('1')
  const [destinationLogin, setDestinationLogin] = useState('')
  const [destinationInventoryId, setDestinationInventoryId] = useState('')
  const [panelActionPending, setPanelActionPending] = useState(false)
  const [bagTransferInventoryId, setBagTransferInventoryId] = useState('')
  const [bagTransferPending, setBagTransferPending] = useState(false)

  const accountLogins = (accounts.data?.accounts ?? []).map((account) => account.login)
  const destinationInventories = useQuery({
    queryKey: ['inventory-destinations', accountLogins],
    queryFn: async () => {
      const rows = await Promise.all(accountLogins.map((accountLogin) => inventoryApi.dashboard(accountLogin)))
      return rows.flat()
    },
    enabled: accountLogins.length > 0,
  })

  const gameItems = useQuery({
    queryKey: ['game-items', login, charId],
    queryFn: () => inventoryApi.gameItems(Number(charId), login),
    enabled: Boolean(charId),
  })

  useEffect(() => {
    setCharId('')
  }, [login])

  useEffect(() => {
    setGameItemsPage(1)
  }, [login, charId, gameItemSearch, gameItemsPageSize])

  const normalizedGameItemSearch = gameItemSearch.trim().toLocaleLowerCase('pt-BR')
  const filteredGameItems = (gameItems.data ?? []).filter((item) => {
    if (!normalizedGameItemSearch) return true
    return item.name.toLocaleLowerCase('pt-BR').includes(normalizedGameItemSearch)
      || String(item.item_id).includes(normalizedGameItemSearch)
  })
  const gameItemsPageCount = Math.max(1, Math.ceil(filteredGameItems.length / gameItemsPageSize))
  const currentGameItemsPage = Math.min(gameItemsPage, gameItemsPageCount)
  const gameItemsPageStart = (currentGameItemsPage - 1) * gameItemsPageSize
  const visibleGameItems = filteredGameItems.slice(gameItemsPageStart, gameItemsPageStart + gameItemsPageSize)
  const gameItemPageWindowStart = Math.max(1, Math.min(currentGameItemsPage - 2, gameItemsPageCount - 4))
  const visibleGameItemPages = Array.from(
    { length: Math.min(5, gameItemsPageCount) },
    (_, index) => gameItemPageWindowStart + index,
  )
  const gameItemsQuantity = filteredGameItems.reduce((total, item) => total + item.quantity, 0)
  const bagItemsQuantity = (bag.data ?? []).reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    setGameItemsPage((page) => Math.min(page, gameItemsPageCount))
  }, [gameItemsPageCount])

  const availableDestinationInventories = (destinationInventories.data ?? []).filter(
    (inventory) => inventory.inventory_id !== panelItemAction?.inventoryId,
  )
  const destinationAccounts = (accounts.data?.accounts ?? []).filter((account) =>
    availableDestinationInventories.some((inventory) => inventory.account_name === account.login),
  )
  const destinationCharacters = availableDestinationInventories.filter(
    (inventory) => inventory.account_name === destinationLogin,
  )

  async function refreshInventory() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['characters', login] }),
      queryClient.invalidateQueries({ queryKey: ['inventory', login] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-destinations'] }),
      queryClient.invalidateQueries({ queryKey: ['bag'] }),
    ])
  }

  async function onWithdraw(event: FormEvent) {
    event.preventDefault()
    try {
      await inventoryApi.withdraw({
        login,
        char_id: Number(charId),
        item_id: Number(itemId),
        quantity: Number(quantity),
      })
      toast.success(t('inventory.toast.withdrawn'))
      await queryClient.invalidateQueries({ queryKey: ['inventory', login] })
      await queryClient.invalidateQueries({ queryKey: ['game-items'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('inventory.toast.withdrawFailed')))
    }
  }

  async function onDeposit(inventoryId: string, depositItemId: number, enchant: number) {
    if (!panelItemAction) return
    const depositQuantity = Number(panelActionQuantity)
    if (!Number.isInteger(depositQuantity) || depositQuantity < 1 || depositQuantity > panelItemAction.availableQuantity) {
      toast.error(t('inventory.toast.invalidDepositQuantity'))
      return
    }

    setPanelActionPending(true)
    try {
      await inventoryApi.deposit({
        login: panelItemAction.originAccount,
        inventory_id: inventoryId,
        item_id: depositItemId,
        quantity: depositQuantity,
        enchant,
      })
      toast.success(t('inventory.toast.deposited', { quantity: depositQuantity, character: panelItemAction.originCharacter }))
      setPanelItemAction(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-destinations'] }),
      ])
    } catch (error) {
      toast.error(apiErrorMessage(error, t('inventory.toast.depositFailed')))
    } finally {
      setPanelActionPending(false)
    }
  }

  async function onTrade(event: FormEvent) {
    event.preventDefault()
    if (!panelItemAction || panelItemAction.mode !== 'trade') return
    const tradeQuantity = Number(panelActionQuantity)
    const destination = (destinationInventories.data ?? []).find(
      (inventory) => inventory.inventory_id === destinationInventoryId,
    )

    if (!destinationLogin || !destination) {
      toast.error(t('inventory.toast.selectDestination'))
      return
    }
    if (!Number.isInteger(tradeQuantity) || tradeQuantity < 1 || tradeQuantity > panelItemAction.availableQuantity) {
      toast.error(t('inventory.toast.invalidTradeQuantity'))
      return
    }

    setPanelActionPending(true)
    try {
      await inventoryApi.trade({
        origin_inventory_id: panelItemAction.inventoryId,
        destination_inventory_id: destination.inventory_id,
        item_id: panelItemAction.itemId,
        quantity: tradeQuantity,
        enchant: panelItemAction.enchant,
      })
      toast.success(t('inventory.toast.traded', { quantity: tradeQuantity, character: destination.character_name }))
      setPanelItemAction(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-destinations'] }),
      ])
    } catch (error) {
      toast.error(apiErrorMessage(error, t('inventory.toast.tradeFailed')))
    } finally {
      setPanelActionPending(false)
    }
  }

  async function onTransferBag(event: FormEvent) {
    event.preventDefault()
    const destination = (destinationInventories.data ?? []).find(
      (inventory) => inventory.inventory_id === bagTransferInventoryId,
    )
    if (!destination) {
      toast.error(t('inventory.toast.selectBagDestination'))
      return
    }

    setBagTransferPending(true)
    try {
      const result = await gamesApi.transferBag(destination.inventory_id)
      toast.success(t('inventory.toast.bagMoved', { moved: result.moved, character: destination.character_name }))
      setBagTransferInventoryId('')
      setSelectedLogin(destination.account_name)
      setActiveTab('characters')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bag'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-destinations'] }),
      ])
    } catch (error) {
      toast.error(apiErrorMessage(error, t('inventory.toast.bagFailed')))
    } finally {
      setBagTransferPending(false)
    }
  }

  function openPanelItemAction(action: PanelItemAction) {
    setPanelItemAction(action)
    setPanelActionQuantity('1')
    setDestinationLogin('')
    setDestinationInventoryId('')
  }

  return {
    login,
    activeTab,
    setActiveTab,
    accounts,
    characters,
    dashboard,
    bag,
    bagItemsQuantity,
    charId,
    setCharId,
    itemId,
    setItemId,
    quantity,
    setQuantity,
    gameItemSearch,
    setGameItemSearch,
    gameItemsPage,
    setGameItemsPage,
    gameItemsPageSize,
    setGameItemsPageSize,
    gameItems,
    filteredGameItems,
    visibleGameItems,
    gameItemsQuantity,
    gameItemsPageCount,
    currentGameItemsPage,
    gameItemsPageStart,
    visibleGameItemPages,
    panelItemAction,
    setPanelItemAction,
    panelActionQuantity,
    setPanelActionQuantity,
    destinationLogin,
    setDestinationLogin,
    destinationInventoryId,
    setDestinationInventoryId,
    panelActionPending,
    bagTransferInventoryId,
    setBagTransferInventoryId,
    bagTransferPending,
    destinationInventories,
    destinationAccounts,
    destinationCharacters,
    setSelectedLogin,
    refreshInventory,
    onWithdraw,
    onDeposit,
    onTrade,
    onTransferBag,
    openPanelItemAction,
  }
}
