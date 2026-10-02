import { Routes, Route } from 'react-router-dom'
import { ValoremWikiHomePage } from './pages/ValoremWikiHomePage'
import { ValoremCommandsPage } from './pages/ValoremCommandsPage'
import { ValoremStaminaPage } from './pages/ValoremStaminaPage'
import { ValoremEnchantBonusPage } from './pages/ValoremEnchantBonusPage'
import { ValoremRaidBossesPage } from './pages/ValoremRaidBossesPage'
import { ValoremRaidBossMapPage } from './pages/ValoremRaidBossMapPage'
import { ValoremClassesPage } from './pages/ValoremClassesPage'
import { ValoremSkillsPage } from './pages/ValoremSkillsPage'
import { ValoremItemsPage } from './pages/ValoremItemsPage'
import { ValoremCraftCalculatorPage } from './pages/ValoremCraftCalculatorPage'
import { ValoremSevenSignsPage } from './pages/ValoremSevenSignsPage'
import { ValoremLocationsPage } from './pages/ValoremLocationsPage'
import { ValoremNpcsPage } from './pages/ValoremNpcsPage'
import { ValoremQuestsPage } from './pages/ValoremQuestsPage'

export function ValoremWikiRouter() {
  return (
    <Routes>
      <Route path="/" element={<ValoremWikiHomePage />} />
      <Route path="commands" element={<ValoremCommandsPage />} />
      <Route path="stamina" element={<ValoremStaminaPage />} />
      <Route path="enchant-bonus" element={<ValoremEnchantBonusPage />} />
      <Route path="raid-bosses" element={<ValoremRaidBossesPage />} />
      <Route path="raid-bosses/map" element={<ValoremRaidBossMapPage />} />
      <Route path="classes" element={<ValoremClassesPage />} />
      <Route path="skills" element={<ValoremSkillsPage />} />
      <Route path="items/*" element={<ValoremItemsPage />} />
      <Route path="craft-calculator" element={<ValoremCraftCalculatorPage />} />
      <Route path="seven-signs" element={<ValoremSevenSignsPage />} />
      <Route path="locations" element={<ValoremLocationsPage />} />
      <Route path="npcs" element={<ValoremNpcsPage />} />
      <Route path="quests" element={<ValoremQuestsPage />} />
      <Route path="*" element={<ValoremWikiHomePage />} />
    </Routes>
  )
}

export default ValoremWikiRouter
