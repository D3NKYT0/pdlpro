import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(scriptsDir, '..')
const publicDir = join(frontendDir, 'public')
const iconsDir = join(publicDir, 'item-icons')
const assetsDir = join(frontendDir, 'assets')
const archive = join(assetsDir, 'item-icons.tar.gz')

if (!existsSync(iconsDir)) {
  console.error('A pasta public/item-icons não existe. Importe os ícones primeiro.')
  process.exit(1)
}

const count = readdirSync(iconsDir).filter((file) => file.toLowerCase().endsWith('.jpg')).length
if (count < 19000) {
  console.error(`Catálogo incompleto: apenas ${count} imagens encontradas.`)
  process.exit(1)
}

mkdirSync(assetsDir, { recursive: true })
const packing = spawnSync('tar', ['-czf', archive, '-C', publicDir, 'item-icons'], { stdio: 'inherit' })
if (packing.status !== 0) process.exit(packing.status ?? 1)

console.log(`Arquivo de deploy criado com ${count} ícones: assets/item-icons.tar.gz`)
