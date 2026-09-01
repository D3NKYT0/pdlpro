import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destIcons = join(__dirname, '..', 'public', 'item-icons');
const omegaIcons = 'D:/PROJETOS/OMEGATEAM/frontend/public/item-icons';
const pdlIcons = 'D:/PROJETOS/PDL/SITE/static/assets/img/l2/icons';

mkdirSync(destIcons, { recursive: true });

function copyOmega() {
  let copied = 0;
  for (const file of readdirSync(omegaIcons)) {
    if (!file.toLowerCase().endsWith('.jpg')) continue;
    copyFileSync(join(omegaIcons, file), join(destIcons, file));
    copied += 1;
  }
  return copied;
}

function copyPdlSite() {
  copyFileSync(join(pdlIcons, 'default.jpg'), join(destIcons, 'default.jpg'));
  let copied = 1;
  for (const file of readdirSync(pdlIcons)) {
    const match = file.match(/^5-(.+)\.jpg$/i);
    if (!match) continue;
    copyFileSync(join(pdlIcons, file), join(destIcons, `${match[1]}.jpg`));
    copied += 1;
  }
  return copied;
}

let copied = 0;
if (existsSync(omegaIcons)) {
  copied = copyOmega();
  console.log(`copied ${copied} icons from Omega`);
} else if (existsSync(pdlIcons)) {
  copied = copyPdlSite();
  console.log(`copied ${copied} icons from PDL SITE`);
} else {
  console.error('Nenhuma pasta de ícones L2 encontrada (Omega ou PDL SITE).');
  process.exit(1);
}

console.log(`catalog is built from backend/data/items XML via: npm run catalog`);
