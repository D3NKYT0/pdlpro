import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const itemsDir = join(repoRoot, 'backend', 'data', 'items')
const destCatalog = join(__dirname, '..', 'src', 'data', 'l2-items.json')

function decodeXml(value) {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function mapGrade(crystalType) {
  const value = (crystalType || 'NONE').toUpperCase()
  if (value === 'D' || value === 'C' || value === 'B' || value === 'A' || value === 'S') return value
  if (value.startsWith('S')) return 'S'
  return 'NG'
}

function classify(kind, type, slots) {
  const slotSet = new Set(slots)
  const itemType = (type || '').toUpperCase()
  if (kind === 'etcitem') return 'COMUM'
  if (kind === 'weapon') {
    if (itemType === 'SHIELD' || itemType === 'SIGIL') return 'SHIELD'
    if (slotSet.has('LEFT_HAND') && !slotSet.has('RIGHT_HAND') && !slotSet.has('LEFT_RIGHT_HAND')) return 'SHIELD'
    return 'WEAPON'
  }
  if (slotSet.has('HEAD')) return 'HELMET'
  if (slotSet.has('FULL_ARMOR') || slotSet.has('CHEST')) return 'ARMOR'
  if (slotSet.has('LEGS')) return 'PANTS'
  if (slotSet.has('FEET')) return 'BOOTS'
  if (slotSet.has('GLOVES')) return 'GLOVES'
  if (slotSet.has('NECKLACE') || slotSet.has('NECK')) return 'NECKLACE'
  if (slotSet.has('RIGHT_EAR') || slotSet.has('LEFT_EAR') || slotSet.has('REAR') || slotSet.has('LEAR') || slotSet.has('EAR')) {
    return 'EARRING'
  }
  if (slotSet.has('RIGHT_FINGER') || slotSet.has('LEFT_FINGER') || slotSet.has('RFINGER') || slotSet.has('LFINGER') || slotSet.has('FINGER')) {
    return 'RING'
  }
  if (slotSet.has('LEFT_HAND') || slotSet.has('LHAND')) return 'SHIELD'
  if (slotSet.has('HAIR') || slotSet.has('HAIR_ALL')) return 'HAIR'
  if (slotSet.has('FACE')) return 'FACE'
  if (slotSet.has('UNDERWEAR')) return 'UNDERWEAR'
  if (slotSet.has('FORMAL_WEAR')) return 'FORMAL'
  if (slotSet.has('WOLF') || slotSet.has('HATCHLING') || slotSet.has('STRIDER') || slotSet.has('BABY_PET')) return 'PET'
  return 'COMUM'
}

function parseItems(xml) {
  const items = []
  const itemRe = /<(weapon|armor|etcitem)\s+id="(\d+)"\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g
  for (const match of xml.matchAll(itemRe)) {
    const kind = match[1]
    const id = match[2]
    const name = decodeXml(match[3]).trim()
    const body = match[4]
    if (!name || /not in use/i.test(name) || /^not used$/i.test(name)) continue
    const sets = {}
    for (const setMatch of body.matchAll(/<set\s+name="([^"]+)"\s+value="([^"]*)"\s*\/>/g)) {
      sets[setMatch[1]] = setMatch[2]
    }
    const slots = [...body.matchAll(/<slot\s+id="([^"]+)"\s*\/>/g)].flatMap((slotMatch) =>
      slotMatch[1]
        .split(';')
        .map((slot) => slot.trim())
        .filter(Boolean),
    )
    items.push({
      id,
      name,
      category: classify(kind, sets.type, slots),
      grade: mapGrade(sets.crystal_type),
    })
  }
  return items
}

const files = readdirSync(itemsDir)
  .filter((file) => file.toLowerCase().endsWith('.xml'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const byId = new Map()
for (const file of files) {
  const xml = readFileSync(join(itemsDir, file), 'utf8')
  for (const item of parseItems(xml)) byId.set(item.id, item)
}

const catalog = [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id))
mkdirSync(dirname(destCatalog), { recursive: true })
writeFileSync(destCatalog, JSON.stringify(catalog.map((item) => [item.id, item.name, item.category, item.grade])))
console.log(`xml files: ${files.length}`)
console.log(`unique items: ${catalog.length}`)
console.log(`wrote ${destCatalog}`)
