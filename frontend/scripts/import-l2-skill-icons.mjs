import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_SKILL_ICONS_DIR = join(__dirname, '..', 'public', 'skill-icons')

export function skillIconDestinationName(file) {
  const numeric = file.match(/^skill(\d+)\.png$/i)
  return numeric ? `${Number(numeric[1])}.png` : null
}

export function importSkillIcons(sourceIcons, destIcons = DEFAULT_SKILL_ICONS_DIR) {
  if (!existsSync(sourceIcons) || !statSync(sourceIcons).isDirectory()) {
    throw new Error(`Pasta de ícones não encontrada: ${sourceIcons}`)
  }

  mkdirSync(destIcons, { recursive: true })

  let copied = 0
  for (const file of readdirSync(sourceIcons)) {
    const destinationName = skillIconDestinationName(file)
    if (!destinationName) continue
    copyFileSync(join(sourceIcons, file), join(destIcons, destinationName))
    copied += 1
  }

  if (copied === 0) {
    throw new Error(`Nenhum arquivo PNG encontrado em: ${sourceIcons}`)
  }

  const zeroIcon = join(destIcons, '0.png')
  const defaultIcon = join(destIcons, 'default.png')
  if (existsSync(zeroIcon) && !existsSync(defaultIcon)) {
    copyFileSync(zeroIcon, defaultIcon)
  }

  return copied
}

function isCli() {
  const entry = process.argv[1]
  if (!entry) return false
  return fileURLToPath(import.meta.url) === resolve(entry)
}

if (isCli()) {
  const configuredSource = process.env.PDL_SKILL_ICON_SOURCE || process.argv[2]
  if (!configuredSource) {
    console.error('Informe a pasta de origem em PDL_SKILL_ICON_SOURCE ou como argumento.')
    console.error('Exemplo: PDL_SKILL_ICON_SOURCE=/caminho/para/icones npm run skill-icons')
    process.exit(1)
  }

  try {
    const copied = importSkillIcons(resolve(configuredSource))
    console.log(`${copied} ícones de skills importados de ${resolve(configuredSource)}.`)
    console.log('Arquivos numéricos skill0001.png passam a /skill-icons/1.png.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
