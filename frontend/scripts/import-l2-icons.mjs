import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destIcons = join(__dirname, '..', 'public', 'item-icons');
const configuredSource = process.env.PDL_ITEM_ICON_SOURCE || process.argv[2];

if (!configuredSource) {
  console.error('Informe a pasta de origem em PDL_ITEM_ICON_SOURCE ou como argumento.');
  console.error('Exemplo: PDL_ITEM_ICON_SOURCE=/caminho/para/icones npm run icons');
  process.exit(1);
}

const sourceIcons = resolve(configuredSource);
if (!existsSync(sourceIcons) || !statSync(sourceIcons).isDirectory()) {
  console.error(`Pasta de ícones não encontrada: ${sourceIcons}`);
  process.exit(1);
}

mkdirSync(destIcons, { recursive: true });

let copied = 0;
for (const file of readdirSync(sourceIcons)) {
  if (!file.toLowerCase().endsWith('.jpg')) continue;
  const legacyName = file.match(/^5-(.+)\.jpg$/i);
  const destinationName = legacyName ? `${legacyName[1]}.jpg` : file;
  copyFileSync(join(sourceIcons, file), join(destIcons, destinationName));
  copied += 1;
}

if (copied === 0) {
  console.error(`Nenhum arquivo JPG encontrado em: ${sourceIcons}`);
  process.exit(1);
}

console.log(`${copied} ícones importados de ${sourceIcons}.`);
console.log('Metadados e URLs são servidos por /api/v1/public/items/catalog/.');
