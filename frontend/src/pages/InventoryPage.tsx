import { Backpack, PackageOpen, RefreshCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { InventoryBagTab } from '../components/inventory/InventoryBagTab'
import { InventoryCharactersTab } from '../components/inventory/InventoryCharactersTab'
import { useInventoryDashboard } from '../components/inventory/useInventoryDashboard'

export function InventoryPage() {
  const inventory = useInventoryDashboard()

  return (
    <div className="grid inventory-page">
      <Card className="inventory-hero">
        <div>
          <span className="panel-eyebrow">Armazém do aventureiro</span>
          <h1>Inventário</h1>
          <p className="muted">Transfira itens entre seus personagens e o painel com segurança.</p>
        </div>
        <Button className="ghost inventory-refresh" type="button" onClick={() => void inventory.refreshInventory()} disabled={!inventory.login}>
          <RefreshCcw aria-hidden="true" />
          Atualizar
        </Button>
      </Card>

      <Tabs id="inventory" label="Escolha o inventário" className="inventory-tabs" value={inventory.activeTab} onChange={inventory.setActiveTab} items={[
        { id: 'characters', label: 'Inventário dos personagens', icon: <PackageOpen aria-hidden="true" /> },
        { id: 'bag', label: 'Bag do site', icon: <Backpack aria-hidden="true" /> },
      ]} />

      {inventory.activeTab === 'characters' ? <InventoryCharactersTab inventory={inventory} /> : null}
      {inventory.activeTab === 'bag' ? <InventoryBagTab inventory={inventory} /> : null}
    </div>
  )
}
