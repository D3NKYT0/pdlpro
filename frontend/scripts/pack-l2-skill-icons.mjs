import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(scriptsDir, '..')
const publicDir = join(frontendDir, 'public')
const iconsDir = join(publicDir, 'skill-icons')
const assetsDir = join(frontendDir, 'assets')
const archive = join(assetsDir, 'skill-icons.tar.gz')
const MIN_SKILL_ICONS = 2000

if (!existsSync(iconsDir)) {
  console.error('A pasta public/skill-icons não existe. Importe os ícones primeiro.')
  process.exit(1)
}

const count = readdirSync(iconsDir).filter((file) => file.toLowerCase().endsWith('.png')).length
if (count < MIN_SKILL_ICONS) {
  console.error(`Catálogo incompleto: apenas ${count} imagens encontradas.`)
  process.exit(1)
}

mkdirSync(assetsDir, { recursive: true })
const packing = spawnSync('tar', ['-czf', archive, '-C', publicDir, 'skill-icons'], { stdio: 'inherit' })
if (packing.status !== 0) process.exit(packing.status ?? 1)

console.log(`Arquivo de deploy criado com ${count} ícones: assets/skill-icons.tar.gz`)
