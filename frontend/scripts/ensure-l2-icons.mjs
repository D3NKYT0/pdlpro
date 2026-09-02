import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(scriptsDir, '..')
const publicDir = join(frontendDir, 'public')
const iconsDir = join(publicDir, 'item-icons')
const archive = join(frontendDir, 'assets', 'item-icons.tar.gz')
const requiredIcons = ['57.jpg', '5575.jpg', '6361.jpg', '3950.jpg', '1459.jpg']

function hasCompleteCatalog() {
  if (!existsSync(iconsDir)) return false
  const files = readdirSync(iconsDir)
  return files.filter((file) => file.toLowerCase().endsWith('.jpg')).length >= 19000
    && requiredIcons.every((file) => files.includes(file))
}

if (!hasCompleteCatalog()) {
  if (!existsSync(archive)) {
    console.error('Catálogo de ícones incompleto e frontend/assets/item-icons.tar.gz não foi encontrado.')
    console.error('Execute `npm run icons` em uma máquina que possua os assets de origem.')
    process.exit(1)
  }

  mkdirSync(publicDir, { recursive: true })
  const extraction = spawnSync('tar', ['-xzf', archive, '-C', publicDir], { stdio: 'inherit' })
  if (extraction.status !== 0) process.exit(extraction.status ?? 1)
}

if (!hasCompleteCatalog()) {
  console.error('O arquivo de ícones foi extraído, mas o catálogo continua incompleto.')
  process.exit(1)
}

console.log(`Catálogo de ícones pronto: ${readdirSync(iconsDir).filter((file) => file.endsWith('.jpg')).length} imagens.`)
