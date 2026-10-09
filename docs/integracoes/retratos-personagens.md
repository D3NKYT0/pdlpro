# Retratos de personagens

[← Lineage](lineage.md)

Os avatares usam raça, sexo e `class_id` Interlude. Classes mágicas usam os novos arquivos `*-mage-{m,f}.png`; classes físicas e personagens sem classe informada mantêm os retratos originais. Anões não possuem linhagem mágica neste catálogo. Classes de suporte e curandeiros pertencem à linhagem mágica, inclusive as terceiras classes.

Os oito novos PNGs estão em `frontend/public/theme/avatars/`, com 432 × 576 pixels para uso no painel. Foram gerados com a ferramenta integrada de geração de imagens e redimensionados na preparação dos assets. Os dez retratos anteriores foram conferidos e preservados. A imagem é ilustrativa: não representa equipamento, cabelo ou rosto efetivos do servidor.

O mesmo resolvedor atende os personagens existentes, a criação pelo jogador e a prévia do admin. No admin, os botões Masculino/Feminino só alteram a ilustração local; nenhum campo de sexo é acrescentado ao perfil salvo.

Testes: `characterPortrait.test.ts` cobre faixas físicas/mágicas, terceiras classes e ambos os sexos; `CreateCharacterModal.test.tsx` cobre as trocas pelo usuário; `AdminSettings.test.tsx` cobre a prévia e o payload salvo.

## Prompts utilizados

O perfil **Padrão geral** usa `general-party.png`: um grupo das cinco raças, com personagens masculinos/femininos e linhagens físicas/mágicas. Essa imagem substitui o ícone abstrato na prévia e representa a base compartilhada por todas as classes. O teste de interação do admin verifica a imagem inicial e a troca para os retratos específicos.

### general-party.png

Use case: stylized-concept. Asset: a single vertical fantasy MMORPG illustration for the GENERAL DEFAULT starting-character profile in a dark gold admin panel. A cohesive heroic party of five adult adventurers representing all five races: human male knight in steel armor in front center, female high elf mage with platinum hair and long pointed ears in ivory emerald cloth robes and green crystal staff on the left, male dark elf mage with blue grey skin and white hair in violet robes behind right, female olive-green orc warrior with small tusks and dark braided hair in leather armor on right, sturdy mature bearded male dwarf fighter in bronze armor at lower left. Clearly distinct faces and silhouettes. Both magical and physical roles, men and women, unified friendly party facing the viewer. Tight group portrait heads and upper torsos, all five heads fully visible with breathing room. Realistic high-end fantasy game cinematic painted render with rich materials matching serious medieval RPG portraits, dark smoky brown background, restrained gold rim light and subtle blue/green/violet magic accents. Vertical 3:4 composition designed to remain legible as a small 150px illustration, clear recognizable five-person grouping, not a collage or grid. No text, no letters, no logo, no border.

### human-mage-m.png

Use case: stylized-concept. Asset: individual fantasy MMORPG character portrait for a dark gold administration/player panel. One adult human male mage, short brown hair, intelligent dignified face, ornate fully covered charcoal and deep blue embroidered cloth robes, small glowing blue crystal staff visible at shoulder, subtle arcane motes. Realistic high-end fantasy game cinematic painted render with rich material detail, matching a serious medieval RPG. Centered head and upper torso, entire head visible with comfortable margin, 3:4 vertical composition, plain smoky dark brown backdrop, soft warm rim light and blue magical accent. Clearly mage cloth silhouette rather than warrior plate armor. No text, no border, no logo, one character only.

### human-mage-f.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult human woman mage, blonde hair tied half back, blue eyes, dignified strong face, fully covered cream and deep blue embroidered cloth robes, luminous blue crystal staff. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a mage wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### elf-mage-m.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult male high elf mage, pale skin, long silver straight hair, long pointed ears, green eyes, refined angular face, flowing fully covered ivory and emerald cloth robes with delicate gold leaf embroidery, slender staff with green magical crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a mage wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### elf-mage-f.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult female high elf mage, pale skin, long platinum blonde hair, long pointed ears, green eyes, refined adult face, flowing fully covered ivory and emerald cloth robes with delicate gold leaf embroidery, slender staff with green magical crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a mage wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### dark-elf-mage-m.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult male dark elf mage, blue grey skin, long white straight hair, long pointed ears, red eyes, angular stern face, fully covered flowing black and violet silk robes with silver embroidery, obsidian staff with purple arcane crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a spellcaster wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### dark-elf-mage-f.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult female dark elf mage, blue grey skin, long white hair, long pointed ears, red eyes, mature refined face, fully covered flowing black and violet silk robes with silver embroidery, obsidian staff with purple arcane crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a spellcaster wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### orc-mage-m.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult male orc shaman, olive green skin, powerful broad face, lower tusks, black hair in topknot, fully covered burgundy cloth ritual robes with geometric gold embroidery and modest bone talismans, wooden staff topped with glowing amber spirit crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a spellcaster wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

### orc-mage-f.png

Use case: stylized-concept. Asset: one individual fantasy MMORPG avatar portrait. Subject: adult female orc shaman, olive green skin, strong mature face, modest lower tusks, long black braided hair, fully covered burgundy cloth ritual robes with geometric gold embroidery and modest bone talismans, wooden staff topped with glowing amber spirit crystal. Realistic high-end fantasy game cinematic painted render, rich cloth materials and natural skin detail. Centered head and upper torso, entire head and ears visible with comfortable margin, vertical 3:4 composition. Plain smoky dark brown background, warm rim light, subtle magic aura. Match serious medieval fantasy portraits. Clearly a spellcaster wearing cloth, no plate shoulder armor. No text, no logo, no border, one character only, no collage.

