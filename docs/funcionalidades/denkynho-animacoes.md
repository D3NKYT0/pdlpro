# Assets e sequências do Denkynho

[Índice](../README.md) · [Ajuda](ajuda.md)

## Arquivos e reprodução

As sequências foram criadas pela ferramenta integrada de geração de imagens, sem CLI ou provedor de vídeo. Cada PNG RGBA contém oito quadros desenhados; a reprodução é uma animação 2D por quadros, não um modelo 3D articulado nem vídeo interpolado.

- [Comendo](../../frontend/public/mascot/denkynho/11-comendo-sequencia.png): 1448 × 1086; lanche, mordida, mastigação e pausa.
- [Jogando](../../frontend/public/mascot/denkynho/12-jogando-sequencia.png): 1448 × 1086; braços, mãos, controle e reação facial.
- [Rindo](../../frontend/public/mascot/denkynho/06-rindo-sequencia.png): 1491 × 1055; boca, cabeça, braços e tronco.

Os originais estáticos permanecem disponíveis para movimento reduzido e fala. Não aplique recortes faciais de uma pose estática sobre os quadros do atlas.

O gerador não entregou células perfeitamente alinhadas nem a resolução solicitada. Por isso, [activitySequences.ts](../../frontend/src/components/help/activitySequences.ts) registra as dimensões reais, a separação entre linhas e uma âncora por quadro. O SVG apenas exibe o recorte do PNG: não redesenha o mascote. A área de clipping impede que pés ou cabelo de quadros vizinhos apareçam. A ancoragem mantém os pés na mesma altura. As durações variam entre 140 e 600 ms para dar ritmo às ações, com repetição de quadros de mastigação e risada.

## Transições e espelhamento

[useMascotPose](../../frontend/src/components/help/useMascotPose.ts) coordena o carregamento e as trocas. A primeira pose carregada aparece sem transição de uma imagem provisória. As demais usam tempos compartilhados entre o estado React e o CSS:

- Mudança de postura: 560 ms, com pequena antecipação, deslocamento e acomodação.
- Virada: 720 ms, com rotação em perspectiva na saída e entrada quando a orientação muda.
- Deitar: 800 ms, com descida e acomodação.
- Acordar: 760 ms, com subida e leve extensão.

São transformações dos sprites 2D, não interpolação de um esqueleto 3D. O atlas de ação congela no quadro atual ao sair. A próxima sequência só começa depois que a entrada termina. Isso evita combinar a troca de postura com uma mordida ou risada já no meio do ciclo.

Comer, jogar, rir e comemorar alternam a orientação nas visitas seguintes à mesma ação; a primeira visita mantém o lado atual. O histórico de lados dura enquanto o componente estiver montado. Poses de conversa e sono preservam a orientação. A fala não dispara espelhamento, e mudar apenas boca, piscada ou a opção de animação não conta como uma nova visita.

A camada `denk-facing` espelha o conjunto completo — corpo, olhos, boca, mãos, lanche e controle — sem modificar os PNGs. Ela é separada da camada de transição e da reprodução do atlas, evitando que uma transformação sobrescreva outra. Desligar animações ou ativar movimento reduzido cancela a transição e preserva a orientação estática, sem uma virada súbita adicional.

Cliques rápidos em atividades substituem apenas o próximo pedido, com no máximo dois personagens durante a transição. Conversa, processamento, erros e sono têm prioridade e podem interromper a fila de lazer. Falhas de carregamento mantêm a pose e o lado anteriores, sem consumir uma visita. Timers e callbacks antigos são cancelados ao trocar de pedido ou desmontar.

[Denkynho.transitions.test.tsx](../../frontend/src/components/help/Denkynho.transitions.test.tsx) verifica virada, espelhamento conjunto, quadros congelados, início do próximo ciclo, deitar/acordar, interrupção pela fala, fila mais recente, movimento desligado e liberação de timers.

## Prompts finais

Referências de identidade: `11-comendo.png`, `12-jogando.png` e `06-rindo.png`, respectivamente. Os prompts abaixo foram usados na ferramenta integrada; os nomes dos arquivos finais acima são os consumidos pelo projeto.

### Comer

```text
Use case: stylized-concept. Production animation SPRITE SHEET for Denkynho. Reference image supplies exact identity, clothing and rendering style. Make ONE sheet containing EXACTLY 8 consecutive full-body animation frames in a strict 4-column x 2-row grid, read left-to-right then second row. Landscape canvas 2048x1536; each cell 512x768, same fixed camera, same size character and same planted feet baseline within each cell. Each cell contains only ONE complete character with generous transparent margin; no overlap between cells, no labels, no borders, no scenery. ACTUAL TRANSPARENT ALPHA PNG, NOT a drawn checkerboard or colored background. Keep the black hair, youthful chibi face, black shirt and pants, blue striped tie, black shoes identical in all 8 frames. Animate EATING a sandwich: frame1 holding sandwich at chest with relaxed closed mouth; frame2 forearms lifting sandwich halfway toward mouth; frame3 sandwich meets open mouth, head dips slightly; frame4 bite, eyes gently close; frame5 lower sandwich revealing mouth, cheeks puff; frame6 sandwich at chest, chewing with lips pursed to one side; frame7 second chew, cheeks move other side, eyes open; frame8 swallow and smile, return to frame1 arm position. This must depict real changes to bent elbows, hands, sandwich height, jaw and cheeks, NOT eight copies of same pose. Preserve lower body exact alignment. No words/numbers.
```

### Jogar

```text
Use case: stylized-concept. Production animation SPRITE SHEET for the EXACT Denkynho in reference. ONE sheet of EXACTLY 8 consecutive full-body animation frames in strict 4 columns x 2 rows, reading left-to-right then down. Canvas 2048x1536. Each cell512x768: same camera, same character size, centered, identical planted feet baseline, keep generous gutters. ACTUAL TRANSPARENT ALPHA PNG, not drawn checkerboard. No numbers, borders or background. Keep black hair, chibi face, black rolled sleeve shirt, blue striped tie, trousers and shoes identical. Action: enthusiastically PLAYING VIDEO GAME WITH CONTROLLER. Frame1 controller centered at chest, both hands holding, focused eyes and closed smile; frame2 left thumb presses joystick and left wrist rotates down; frame3 right thumb presses buttons, controller tilts right, head leans slightly; frame4 concentrated narrowed eyes and controller centered; frame5 excited eyebrows lift, mouth opens, forearms lift controller to upper chest; frame6 happy excited open-mouth grin with shoulders raised and controller angled left; frame7 hands lower, right thumb taps and eyes blink; frame8 relaxed focused pose matches frame1 for loop. Visible hand/arm/controller and facial changes, NOT identical poses bobbing. Keep legs and feet precisely same in all frames. One full character per cell, no clipping.
```

### Rir

```text
Use case: stylized-concept. Create ONE production animation SPRITE SHEET of the exact reference Denkynho laughing. EXACTLY 8 full-body consecutive frames in strict 4 columns x 2 rows on landscape2048x1536, each equal cell512x768. ONE character per cell, head and feet not cropped, same scale, fixed camera, planted feet at identical cell coordinates, consistent black hair, chibi face, black rolled sleeve shirt, blue striped tie and dark trousers/shoes, same polished3D rendering. ACTUAL TRANSPARENT ALPHA BACKGROUND, no drawn checkerboard, no background glow, no text/numbers/grid lines. Action loop: 1 smile closed mouth, hand near cheek, other hand stomach; 2 mouth begins opening, cheeks lift; 3 hearty laugh mouth wide open, eyes squeeze closed, shoulders lift; 4 head tips back and elbow lifts, belly laugh; 5 leans slightly forward hand on stomach, mouth still open smaller; 6 another laugh eyes closed and mouth wide, shoulders contract; 7 wipes a happy tear from cheek, mouth closing to grin; 8 returns to starting relaxed smile and hands. Clear facial and articulated arm motion, not eight copies. Legs and feet alignment must stay identical; no camera or scale changes.
```

### Remoção do fundo de comer e rir

```text
Use case: background-extraction. Edit the provided 8-frame sprite sheet ONLY to remove the fake white/gray checkerboard background. Return actual RGBA PNG with empty background pixels alpha=0. Preserve every pixel of the eight characters and ALL their exact positions, sizes, spacing and grid layout. Do not redraw characters, do not reposition, do not crop, do not add glow. Output same 1448x1086 resolution. Transparent alpha, NOT a drawn checkerboard.
```

A saída final foi conferida como RGBA e inspecionada no tema do painel. O atlas de jogo já veio com transparência. A remoção do fundo de risada alterou as dimensões, refletidas no manifesto de reprodução.
