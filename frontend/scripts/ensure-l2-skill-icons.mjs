import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(scriptsDir, '..')
const publicDir = join(frontendDir, 'public')
const iconsDir = join(publicDir, 'skill-icons')
const archive = join(frontendDir, 'assets', 'skill-icons.tar.gz')
const requiredIcons = ['1.png', '58.png', '100.png', '1177.png', '1410.png']
const MIN_SKILL_ICONS = 2000

function hasCompleteCatalog() {
  if (!existsSync(iconsDir)) return false
  const files = readdirSync(iconsDir)
  return files.filter((file) => file.toLowerCase().endsWith('.png')).length >= MIN_SKILL_ICONS
    && requiredIcons.every((file) => files.includes(file))
}

if (!hasCompleteCatalog()) {
  if (!existsSync(archive)) {
    console.error('Catálogo de ícones de skills incompleto e frontend/assets/skill-icons.tar.gz não foi encontrado.')
    console.error('Execute `npm run skill-icons` em uma máquina que possua os assets de origem.')
    process.exit(1)
  }

  mkdirSync(publicDir, { recursive: true })
  const extraction = spawnSync('tar', ['-xzf', archive, '-C', publicDir], { stdio: 'inherit' })
  if (extraction.status !== 0) process.exit(extraction.status ?? 1)
}

if (!hasCompleteCatalog()) {
  console.error('O arquivo de ícones de skills foi extraído, mas o catálogo continua incompleto.')
  process.exit(1)
}

console.log(`Catálogo de ícones de skills pronto: ${readdirSync(iconsDir).filter((file) => file.endsWith('.png')).length} imagens.`)
