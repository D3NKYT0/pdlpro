import { useTranslation } from 'react-i18next'
import { Backpack, PackageOpen, RefreshCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { InventoryBagTab } from '../components/inventory/InventoryBagTab'
import { InventoryCharactersTab } from '../components/inventory/InventoryCharactersTab'
import { useInventoryDashboard } from '../components/inventory/useInventoryDashboard'

export function InventoryPage() {
  const { t } = useTranslation('panel')
  const inventory = useInventoryDashboard()

  return (
    <div className="grid inventory-page">
      <Card className="inventory-hero">
        <div>
          <span className="panel-eyebrow">{t('inventory.hero.eyebrow')}</span>
          <h1>{t('inventory.hero.title')}</h1>
          <p className="muted">{t('inventory.hero.subtitle')}</p>
        </div>
        <Button className="ghost inventory-refresh" type="button" onClick={() => void inventory.refreshInventory()} disabled={!inventory.login}>
          <RefreshCcw aria-hidden="true" />
          {t('inventory.refresh')}
        </Button>
      </Card>

      <Tabs id="inventory" label={t('inventory.tabsLabel')} className="inventory-tabs" value={inventory.activeTab} onChange={inventory.setActiveTab} items={[
        { id: 'characters', label: t('inventory.tabs.characters'), icon: <PackageOpen aria-hidden="true" /> },
        { id: 'bag', label: t('inventory.tabs.bag'), icon: <Backpack aria-hidden="true" /> },
      ]} />

      {inventory.activeTab === 'characters' ? <InventoryCharactersTab inventory={inventory} /> : null}
      {inventory.activeTab === 'bag' ? <InventoryBagTab inventory={inventory} /> : null}
    </div>
  )
}
