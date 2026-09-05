# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Interação com o personagem

Clique ou toque no Denkynho para abrir ações, dicas rápidas, FAQ, idioma e animações. **Conversar** fecha o menu e leva o foco ao campo da mensagem, sem enviar nada. **Me dê uma dica** alterna orientações locais de uso e segurança; não consulta IA nem altera o histórico. O menu fecha pelo botão, por Escape ou por um toque fora dele. As atividades continuam respeitando os bloqueios da conversa.

Em telas de até 900 px, o personagem fica flutuante, sem reservar uma coluna ou um cartão acima do chat. Arraste o próprio personagem para movê-lo; um movimento menor que 6 px continua sendo um toque. Também é possível movê-lo com as setas quando estiver focado e usar **Reposicionar personagem** no menu. A posição é temporária e limitada à área visível, inclusive após redimensionamento ou abertura do teclado virtual. O menu tem rolagem própria em telas pequenas e recolhe ao escolher uma atividade para deixar a animação visível.

[HelpCompanion](../../frontend/src/components/help/HelpCompanion.tsx) concentra a interação sem duplicar o renderizador ou seus timers. Sua alça usa um botão nativo especializado para arraste; as ações e superfícies internas reutilizam `Button`, `Card`, `Toggle` e `Field` do tema. [Os testes de interação](../../frontend/src/components/help/HelpCompanion.test.tsx) cobrem abertura, foco, dicas, fechamento, toque versus arraste, cancelamento, limites e redimensionamento; os testes da página preservam o contrato HTTP e os bloqueios das atividades.

## Acessar e conversar

### Melhorias de conversa e navegação

A pergunta aparece imediatamente com o estado de espera viva: pose **pensando** e frases curtas em ciclo (**Estou pensando…**, **Deixa eu consultar com calma…**, …). A tela não espera o JSON inteiro para mostrar que o Denkynho está ocupado. É possível escrever o próximo rascunho durante a consulta e a revelação visual; o envio continua bloqueado até o turno terminar. Uma falha marca a pergunta e oferece **Reenviar mensagem**, sem duplicá-la no histórico ou apagar um rascunho novo. Se nenhum novo texto tiver sido escrito, a pergunta retorna ao campo. O histórico só acompanha a resposta automaticamente quando a pessoa está perto do fim da rolagem.

Fora de `/painel/ajuda`, o shell do painel mostra um mini-mascote com o humor atual. O toque abre a ajuda contextual da tela; um selo discreto avisa necessidades (**o Denkynho está com fome**) e a primeira visita do dia pode mostrar um pouco de XP, sem streak punitiva. **Conversar sobre esta tela** leva o assunto para Ajuda. A pergunta sugerida preenche o campo e exige envio manual. Cada consulta envia a rota conhecida em `screen` (por exemplo, `você está em Carteira`). O parâmetro `from` aceita apenas rotas conhecidas; links de módulos aguardam a consulta de recursos, respeitam recursos desativados e acesso à equipe. Caminhos relativos conhecidos em uma resposta podem virar botões de navegação; endereços externos, inventados e destinos não autorizados são ignorados. Nenhum botão executa operações da conta. **Abrir chamado sobre esta tela** pré-preenche o assunto e a tela de origem, sem enviar o histórico do chat.

No celular, **Recolher personagem** libera espaço e deixa **Mostrar personagem** disponível, com foco de teclado preservado. O estado recolhido vale só durante a visita. Os controles continuam disponíveis por rolagem própria no menu.

### Preferências opcionais

No menu do mascote, **Do seu jeito** permite escolher nome e respostas curtas, equilibradas ou detalhadas. **Aplicar preferências** vale só para a conversa, a menos que **Lembrar minhas preferências** esteja marcado. Com essa opção, nome e tamanho das respostas ficam no `DenkynhoProfile` da conta (`PATCH /api/v1/shared/content/assistant/pet/`) e uma cópia local ajuda a hidratar o navegador atual. O idioma permanece neste navegador. Não há tabela de conversas: o histórico e o token de contexto nunca são gravados.

**Apagar preferências** remove essas escolhas na conta e neste navegador, restaura o tamanho equilibrado e limpa o nome do contexto temporário. Desmarcar a opção de lembrar e aplicar também remove o registro local; se o nome e o tamanho voltarem ao padrão, o perfil da conta é limpo. Valores corrompidos são ignorados; indisponibilidade do armazenamento ou da API é informada. Trocar de conta carrega as escolhas da sessão. A API aceita `{preferred_name, detail}` no perfil e `preferences: {preferred_name?: string, detail?: "brief" | "balanced" | "detailed"}` no chat; valida o nome, limita-o a 30 caracteres e não confunde preferências com permissões.

O contexto assinado preserva nome, tamanho da resposta e uma janela de turnos mesmo quando a geração falha ou está desligada. Na recuperação, o modelo recebe os turnos recentes da ajuda básica. Assinatura, expiração de 30 minutos e vínculo ao usuário, papel e idioma continuam obrigatórios. Na busca de fontes do chat, embeddings desativados, inválidos ou indisponíveis acionam a comparação lexical compartilhada com o FAQ, sempre sobre os artigos autorizados.

### Evolução e armário

Cuidados exibem o XP e as alterações reais dos atributos. Uma subida de nível confirmada pela API provoca comemoração; repetir uma solicitação idempotente não repete a comemoração nem concede XP extra. Após perda de rede, a tentativa do mesmo cuidado reutiliza a chave anterior.

| Nível | Desbloqueio |
| --- | --- |
| 2 | Broche de estrela |
| 3 | Dançar juntos: nova atividade que consome energia e saciedade e aumenta alegria e XP |
| 4 | Biblioteca aconchegante |
| 5 | Acampamento noturno |

O armário permite usar ou retirar peças gratuitamente, com persistência no perfil do mascote. `GET /api/v1/shared/content/assistant/pet/wardrobe/` consulta o catálogo; `PATCH` recebe `{slot, item_id}` para `accessory` ou `scene`. `item_id: ""` retira uma peça. Peças desconhecidas, do espaço errado ou acima do nível são recusadas. A sessão determina o dono do perfil; os cosméticos não concedem itens nem benefícios no servidor de jogo. A migração `content.0017` acrescenta a aparência persistente e a ação de dança.

Os cosméticos são camadas vetoriais/CSS nas poses estáticas, incluindo conversa; os atlas de comer, brincar, rir, dormir, dançar, carinho, banho, caminhar, pensar, confuso e comemorar nível preservam sua arte original. Dança, banho, caminhada, espera viva, pequenos gestos durante a fala e a comemoração respeitam **Animar personagem** e movimento reduzido. Falas de cuidado variam, e o prompt pede ao modelo para evitar repetir aberturas e bordões do histórico.

Para revisão local sem credenciais nem operações reais, `npm run dev` disponibiliza `/denkynho.html`: monta a página real e o tema do painel com uma fronteira HTTP demonstrativa. Essa entrada não integra o build de produção. Ela simula respostas e evolução; não substitui os testes da API ou a homologação com o provedor configurado.

Testes adicionais: `HelpPage.experience.test.tsx`, `HelpPreferences.test.tsx`, `ContextualHelp.test.tsx`, `PrivateLayout.test.tsx`, `PetProgress.test.tsx`, `SupportPage.test.tsx`, `test_chat.py`, `test_denkynho_pet_api.py`, `test_denkynho_handbook_admin.py` e `test_denkynho_wardrobe_api.py`. Cobrem envio imediato, espera viva, rascunho seguinte, recuperação, preferências na conta, mini-mascote no shell, chamado pré-preenchido, navegação autorizada, visita diária, equipar/retirar, desbloqueios, insuficiência, idempotência e rollback.

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Em desktop e no celular, a tela ocupa a altura da janela: o histórico da conversa é a única área com rolagem. O cabeçalho permanece compacto e o campo de mensagem fica visível; no celular o envio cabe em uma linha, com o rótulo e a dica só para leitores de tela. Escreva uma dúvida e pressione **Enter** para enviar; **Shift+Enter** quebra a linha. Você também pode filtrar as sugestões por assunto ou escolher uma pergunta. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Ver orientação completa** abre os detalhes do artigo; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho reconhece o usuário da sessão e informa se está conversando com jogador, equipe ou superadministrador. Sugere o primeiro nome de exibição e pergunta como a pessoa prefere ser chamada; o apelido só passa a ser usado depois de uma resposta válida. A pessoa pode conversar em português ou inglês. O frontend envia cada mensagem aceita ao endpoint autenticado `POST /api/v1/shared/content/assistant/reply/`, com a rota conhecida em `screen`. A mensagem é interpretada na requisição e não é gravada. O histórico é temporário e desaparece ao sair da tela ou recarregá-la. O apelido e o tamanho das respostas ficam no perfil do mascote somente quando a pessoa pede para lembrar.

A rota autenticada filtra o conhecimento no backend: jogadores recebem artigos públicos; moderadores, staff e administradores recebem também artigos da equipe; superadministradores recebem todos os níveis. A interface apenas apresenta o resultado autorizado. A API pública `GET /api/v1/public/faq/` continua retornando exclusivamente artigos públicos, mesmo quando chamada por uma pessoa autenticada.

## Conversa com modelo

A camada de conversa foi inspirada na separação entre personalidade, memória e provedor do Ashley. O Denkynho usa **Pydantic** para validar respostas e um de três modos de geração, escolhido na implantação:

| Modo | Configuração | Uso |
| --- | --- | --- |
| Desligado | `DENKYNHO_LLM_ENABLED=false` | Ajuda básica (FAQ + RapidFuzz). Padrão. |
| Local | `DENKYNHO_LLM_ENABLED=true` e `DENKYNHO_LLM_PROVIDER=ollama` | SDK **Ollama** em loopback ou no Compose opcional. |
| Remoto | `DENKYNHO_LLM_ENABLED=true` e `DENKYNHO_LLM_PROVIDER=remote` | API HTTP compatível com OpenAI (`/chat/completions`). |

O FAQ permanece como fonte editorial. A VPS fraca não remove o Ollama: quem tiver CPU e RAM usa o modo local; quem não tiver usa a API remota ou deixa desligado. MiniLM (`DENKYNHO_EMBEDDINGS_ENABLED`) é independente da geração.

Toda mensagem aceita pelo filtro do navegador vai ao endpoint autenticado com `conversation: true`, `context` e a rota conhecida, inclusive cumprimentos e correções. O backend verifica moderação e identidade, recupera o contexto assinado, seleciona até três artigos autorizados — inclusive o handbook interno de passo a passo — e pede uma resposta ao modelo. O resultado inclui texto, tipo, pose e, quando aplicável, uma referência válida ao FAQ. Fontes inventadas, JSON inválido, texto vazio ou ofensivo e poses desconhecidas são recusados. Um `affect` opcional do modelo, quando a geração está ligada, informa empatia implícita; se vier inválido, é ignorado e o regex da mensagem continua como fallback.

O prompt de personalidade está em [chat.py](../../backend/apps/content/application/chat.py). Define um assistente simpático, curioso, com humor leve, respostas breves e transparência sobre ser virtual. Ele considera o histórico para resolver referências, mudar de assunto e reparar interpretações erradas. O humor atual entra no prompt como `EMOCAO`: origem `user` é empatia; `needs` são as necessidades do mascote. Risadas, tristeza, conquistas e preferências de nome ou de detalhe são interpretadas pelo modelo; não dependem de cadastrar cada frase. Não deve cobrar atenção de quem ficou ausente nem terminar toda fala com uma pergunta.

O modelo recebe o nome básico da conta e o papel calculado no backend. Não recebe e-mail, credenciais, saldos ou acesso a ferramentas. Artigos de staff/superadmin são filtrados antes da busca e antes de construir o prompt. Alegar um cargo na mensagem não altera permissões. O texto gerado ainda pode conter imprecisões: mantenha o FAQ atualizado e encaminhe situações individuais ao Atendimento.

## Contexto e privacidade

O servidor devolve um token assinado com até 12 mensagens recentes, limitado também a aproximadamente 6.000 caracteres de histórico. O token é legível, não é criptografado e fica apenas no estado desta tela; não vai para localStorage nem para uma tabela de conversas. Expira após 30 minutos e é vinculado ao usuário, papel e idioma. Token alterado, expirado ou de outra identidade é descartado. A preferência de nome é mantida no `DenkynhoProfile` quando a pessoa pede para lembrar; durante a conversa, o token também a carrega para os turnos seguintes. O modelo propõe a preferência; o backend só aceita um nome de até 30 caracteres presente literalmente na mensagem atual e aprovado pelo filtro.

**Nova conversa**, recarregar/sair da tela, trocar idioma ou identidade limpa o contexto do navegador. Respostas em trânsito de uma identidade anterior são descartadas. Mensagens recusadas pelo filtro não entram no histórico. O texto e o histórico recente vão ao backend e, se a geração estiver ligada, ao Ollama local ou à API remota configurada; não envie senhas ou códigos. O PDL não registra transcrições no banco nem inclui prompts em logs de falha do modelo.

## Configurar e iniciar

Há três escolhas. Nenhuma delas é removida porque a VPS de produção seja pequena.

### Sem geração

```dotenv
DENKYNHO_LLM_ENABLED=false
```

A Ajuda responde com FAQ, RapidFuzz e o repertório social. `start_denkynho` não inicia Ollama.

### Ollama local

1. Instale [Ollama](https://docs.ollama.com/windows) no computador que executa o backend.
2. Baixe o modelo: `ollama pull qwen3.5:4b`.
3. No `.env` do PDL, configure:

```dotenv
DENKYNHO_LLM_ENABLED=true
DENKYNHO_LLM_PROVIDER=ollama
DENKYNHO_OLLAMA_URL=http://127.0.0.1:11434
DENKYNHO_LLM_MODEL=qwen3.5:4b
DENKYNHO_LLM_TIMEOUT=120
```

O `start-dev.bat` instala as dependências do Python e chama `manage.py start_denkynho`. O comando reutiliza um Ollama ativo ou procura o executável no PATH e em `%LOCALAPPDATA%/PDL/ollama/ollama.exe`. Quando inicia um processo, usa loopback, `OLLAMA_NO_CLOUD=1` e nenhuma janela extra. Não baixa modelos no boot. Instalações fora desses caminhos devem disponibilizar `ollama` no PATH. Falhas são informadas e o restante do PDL continua com ajuda básica. Com `DENKYNHO_LLM_PROVIDER=remote` o comando não inicia Ollama.

O adaptador local aceita endereços de loopback HTTP e, com a configuração Docker explícita descrita abaixo, o serviço `http://ollama:11434`. Ignora proxies do ambiente e não segue redirecionamentos. Tags de nuvem e caminhos remotos são recusados neste modo. Na instalação local de desenvolvimento, o runtime portátil 0.33.3 foi verificado com o SHA-256 publicado pelo projeto e instalado em `%LOCALAPPDATA%/PDL/ollama`; os pesos ficam no armazenamento padrão do Ollama, fora do repositório.

O modelo de 4 bilhões de parâmetros pode rodar em CPU, mas a velocidade depende do hardware e da carga; não promete resposta instantânea. O prazo configurado limita a espera pelo servidor de geração, sem retries automáticos. A primeira carga do modelo semântico e do gerador pode demorar mais.

A saída usa [JSON estruturado do Ollama](https://docs.ollama.com/capabilities/structured-outputs). O runtime recebe o esquema sem os limites grandes de comprimento, que podem gerar gramática incompatível; o orçamento de tokens limita a geração e Pydantic aplica o limite de 2.000 caracteres depois.

### API remota

Use um endpoint compatível com OpenAI Chat Completions (OpenAI, Groq, OpenRouter, vLLM, Ollama em outro host em `/v1`, etc.):

```dotenv
DENKYNHO_LLM_ENABLED=true
DENKYNHO_LLM_PROVIDER=remote
DENKYNHO_LLM_API_URL=https://api.openai.com/v1
DENKYNHO_LLM_API_KEY=sk-...
DENKYNHO_LLM_MODEL=gpt-4o-mini
DENKYNHO_LLM_TIMEOUT=120
```

A URL pode ser a base (`…/v1`) ou o caminho completo `…/v1/chat/completions`. HTTP e HTTPS são aceitos; usuário/senha na URL são recusados. A chave vai só no cabeçalho `Authorization` e não entra em logs de falha. O adaptador pede `response_format: json_object`; se o provedor recusar com HTTP 400, tenta de novo sem esse campo. Pydantic valida o JSON. Fontes inventadas, texto vazio ou ofensivo e poses desconhecidas continuam recusados no backend. A chave fica no `.env` da API, nunca no frontend.

Em um `.env` de produção já existente, use `./setup.sh configure-production` para
acrescentar as chaves novas sem sobrescrever domínio e segredos. As flags
`--denkynho-provider remote`, `--denkynho-api-url`, `--denkynho-api-key` e
`--denkynho-model` ligam esse modo. Detalhes em [Implantação](../operacao/implantacao.md).

## Qwen dentro do Docker do projeto

O arquivo [docker-compose.ollama.yml](../../docker-compose.ollama.yml) complementa o Compose de desenvolvimento ou de produção. Requer Docker com Compose v2 e containers Linux. Prepare o `.env` conforme o guia de ambiente correspondente.

Na raiz do projeto, para desenvolvimento:

```bash
docker compose -f docker-compose.yml -f docker-compose.ollama.yml --profile dev up -d --build
```

Para produção, use o arquivo de produção como base, sem o Compose de desenvolvimento:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ollama.yml up -d --build
```

Não é obrigatório combinar o overlay Ollama com produção. Se a VPS não tiver CPU e memória para o Qwen 4B, use `DENKYNHO_LLM_PROVIDER=remote` ou deixe a geração desligada. O overlay continua disponível para quem quiser Ollama no mesmo Compose.

O serviço `ollama` executa o runtime 0.33.3 em CPU. `ollama_init` baixa `qwen3.5:4b` (aproximadamente 3,4 GB) e precisa terminar com sucesso antes de o backend iniciar. `DENKYNHO_LLM_MODEL` permite selecionar outra tag local; mantenha a mesma seleção nos comandos posteriores. A primeira execução precisa de internet para baixar imagens, pesos e embeddings. Downloads de pesos já presentes são reaproveitados.

O backend usa `http://ollama:11434` pela rede `ollama_net`, com permissão explícita `DENKYNHO_OLLAMA_DOCKER=true`. Essa exceção aceita somente esse endereço; não libera servidores arbitrários. O Compose ativa a geração independentemente do valor nativo de `DENKYNHO_LLM_ENABLED`. A porta 11434 não é publicada no computador nem na internet. O acesso do navegador continua pela API autenticada do PDL, preservando filtro e autorização dos artigos. O runtime está com nuvem desativada.

Os pesos ficam no volume Docker `ollama_models` (normalmente prefixado pelo nome do projeto), montado em `/root/.ollama`. Persistem ao recriar containers e executar `down`; `down -v` apaga volumes, incluindo banco e modelos, portanto não é um comando de atualização. O Docker não reutiliza automaticamente a instalação nativa em `C:\Users\danie\.ollama`; o `start-dev.bat` continua usando o Ollama nativo.

Diagnóstico em desenvolvimento (em produção, substitua o primeiro arquivo por `docker-compose.prod.yml`):

```bash
docker compose -f docker-compose.yml -f docker-compose.ollama.yml ps -a
docker compose -f docker-compose.yml -f docker-compose.ollama.yml logs --tail=100 ollama ollama_init backend
docker compose -f docker-compose.yml -f docker-compose.ollama.yml exec ollama ollama list
```

Se o download falhar, confira os logs e repita o comando `up` depois de corrigir conexão ou tag. Após a subida, confirme na tela Ajuda uma resposta com `engine: ollama`. Se o runtime ficar indisponível durante o uso, o chat informa o modo limitado e tenta novamente nas mensagens seguintes. Os proxies Nginx reservam 180 segundos para esse endpoint; o SDK limita a chamada ao modelo a 120 segundos. Docker organiza a execução, mas não acelera a inferência em CPU. Aloque memória suficiente ao Docker e evite manter simultaneamente os modelos nativo e Docker carregados em máquinas com pouca RAM.

Os testes de conversa cobrem o endereço Docker autorizado, sua rejeição sem permissão e o bloqueio de outros hosts, protocolos, portas, credenciais e caminhos. A subida real deve verificar download inicial, recriação com volume preservado, resposta autenticada e contingência com `ollama` parado.

Validação da integração em 04/09/2026: os dois arquivos base combinados com o complemento passaram em `docker compose config`, preservando dependências, volume e ausência de porta pública. Passaram 836 testes do backend (85,60% de cobertura; adaptador Ollama com 100%), 699 do frontend, typecheck, build e verificações Django. O Ruff dos arquivos alterados passou; a análise global mantém 575 ocorrências preexistentes. Sem Docker Engine disponível no ambiente de desenvolvimento, a subida dos containers e o proxy Nginx em execução permanecem pendentes de homologação.

## Ajuda básica quando a geração está indisponível

Desabilitar a geração, atingir timeout ou receber uma saída inválida resulta em `mode: limited`, com aviso visível na tela. A consulta usa **Lingua** e **RapidFuzz**. **Sentence Transformers** entra só quando `DENKYNHO_EMBEDDINGS_ENABLED` está ativo; em produção o padrão é desligado para não baixar MiniLM no primeiro chat, mas pode ser ligado. As interações sociais usam o repertório editorial existente. Este modo é limitado e não é apresentado como conversa generativa. As mensagens seguintes tentam novamente o modelo; uma resposta válida remove o aviso.

A API antiga, sem `conversation: true`, mantém o contrato de busca editorial. Perguntas com correspondência segura recebem resposta curta, detalhes e fonte; as demais pedem esclarecimento. [dialogue.ts](../../frontend/src/components/help/dialogue.ts) e [personality.ts](../../frontend/src/components/help/personality.ts) mantêm o repertório de contingência e as boas-vindas.

**Atendimento da equipe** abre `/painel/support`. A partir da ajuda contextual, o assunto e a tela de origem podem vir pré-preenchidos; o histórico do chat nunca é enviado junto.

## Catálogo inicial

A migration `content.0004_seed_pdl_faq` publica 38 orientações em oito assuntos: primeiros passos; conta e segurança; contas e personagens; carteira e inventário; loja e comércio; jogos e recompensas; conteúdo e comunidade; ajuda e atendimento. O catálogo cobre os módulos disponíveis no PDL sem fixar preços, taxas, limites ou prazos configuráveis. IDs determinísticos permitem reaplicar a carga e removê-la no rollback sem atingir artigos criados pela administração.

A migration `content.0009_seed_english_faq` acrescenta as versões em inglês dos 38 artigos públicos e quatro artigos internos. A página pública `/faq` permite trocar o idioma, buscar em pergunta, resposta e palavras-chave e filtrar por assunto. As rotas de FAQ aceitam `?lang=pt` ou `?lang=en`; a API também retorna `language`, `audience` e `audience_label`. O Django Admin permite editar as duas versões e publicar cada artigo para todos, para a equipe ou somente para superadministradores.

## Handbook interno do Denkynho

A migration `content.0013_seed_denkynho_handbook` publica 61 orientações de passo a passo marcadas como `assistant_only`. Elas alimentam só a consulta do assistente: não entram em `/faq`, nas sugestões da Ajuda nem nas APIs de listagem, mesmo para superadministradores. O Denkynho continua filtrando por papel: jogadores recebem os 45 artigos públicos do handbook; a equipe recebe também os 13 de staff; superadministradores recebem os 3 exclusivos de temas e permissões.

O handbook descreve rotas reais do painel (`/painel/wallet`, `/painel/accounts`, `/painel/admin/atendimento` e correlatas), sem fixar preços, taxas ou prazos configuráveis. No Django Admin, o proxy **DenkynhoHandbook** e o filtro **Somente assistente** separam esses artigos do FAQ listado. Novos passo a passo usam o fluxo editorial: marque `assistant_only` e mantenha as versões em português e inglês; a migração `content.0018` cria só o proxy, sem republicar o catálogo.

## Moderação da conversa

O filtro foi adaptado do serviço de moderação do HollowDuel. Antes de exibir ou interpretar uma mensagem, ele remove caracteres invisíveis e acentos, converte substituições comuns como `0` por `o`, ignora pontuação usada entre letras e reconhece repetições e letras separadas. A correspondência respeita limites de palavra para não bloquear termos legítimos que apenas contêm a mesma sequência.

Mensagens recusadas no navegador não são adicionadas ao histórico, não consultam a API e não podem definir o apelido. O backend repete a validação em português e inglês antes de executar a busca, impedindo contorno por outro cliente. A tela apresenta um erro claro e permite reformular. A lista é curta e própria para a conversa de ajuda; qualquer ampliação deve incluir casos bloqueados, tentativas de contorno e falsos positivos nos testes.

## Animações

O componente [Denkynho](../../frontend/src/components/help/Denkynho.tsx) recebe `pose`, `talking`, `mouthOpen`, `animated` e `celebration`. Os assets PNG transparentes ficam em `frontend/public/mascot/denkynho/`. O manifesto [poses.json](../../frontend/src/components/help/poses.json) relaciona as poses, inclusive dança, carinho, banho e caminhada, e os recortes dos olhos e da boca. As bases originais são de 512 × 768; comendo, jogando, dançando, carinho, banho e caminhada usam 1024 × 1536, na mesma proporção 2:3. As coordenadas dos recortes usam o espaço lógico de 256 × 384 e são convertidas em porcentagem. As novas poses não reutilizam recortes faciais das anteriores.

| Estado da conversa | Comportamento |
| --- | --- |
| Boas-vindas e conversa social | Pose definida pela intenção, fala, respiração e piscadas |
| Consultando | Pose pensando, com atlas de espera e frases curtas |
| Resposta publicada | Pose de dica ou continuidade da emoção recente; boca acompanha ritmo e pontuação |
| Sem correspondência | Pose confusa, com atlas próprio |
| Falha de consulta | Pose triste e rascunho preservado |
| Subida de nível | Atlas de sucesso só com `celebration`; o idle permanece estático |
| 45 segundos sem interação | Entra em ociosidade na pose do humor atual, sem usar a cama |

### Atividades do personagem

Na lateral da Ajuda, ícones SVG para **Alimentar**, **Dormir**, **Brincar**, **Dar banho**, **Caminhar** e **Dançar juntos** (quando desbloqueado) ocupam o botão do tema e cuidam do Denkynho por oito segundos, inclusive para acordá-lo. Cada controle preserva o nome acessível e exibe o rótulo em tooltip. O banho aumenta a higiene em até 30 pontos, limitada a 100, e também concede 6 pontos de alegria. Caminhar consome 5 pontos de energia, aumenta a alegria em até 8 pontos e concede 8 XP; a ação é recusada se houver menos de 5 pontos de energia. Cada conta autenticada possui seu próprio mascote: nível, XP, saciedade, energia, alegria, higiene e um humor visível. Os atributos variam de 0 a 100 e sofrem desgaste a cada meia hora; o nível e o XP do Denkynho não alteram o progresso do personagem no jogo. A primeira visita do dia concede um pouco de XP, sem sequência punitiva se a pessoa faltar.

O humor existe para o companheiro acompanhar a pessoa, não só para ilustrar uma resposta. Com a geração ligada, o modelo pode informar o tom implícito; o regex da mensagem permanece como fallback para frases explícitas. O servidor grava só o identificador curto (`sad`, `sleepy`, …), sem o texto da conversa. Quando a empatia expira ou a pessoa diz que já está bem, o humor volta às necessidades do mascote: fome, sono, higiene baixa ou alegria baixa. A cama continua exclusiva do cuidado **Dormir**; ociosidade com sono usa a pose em pé. O shell do painel espelha esse humor no mini-mascote e no selo de necessidade.

O frontend lê e atualiza o mascote pelo endpoint autenticado `GET`/`POST`/`PATCH /api/v1/shared/content/assistant/pet/` e recebe o mesmo `emotion` em cada resposta de `assistant/reply/`. A pose ociosa segue `idle_pose`; a fala social usa a pose empática; uma orientação do FAQ mantém a pose de dica enquanto ele fala. O painel mostra o humor e se ele está acompanhando você ou reagindo ao cuidado. Todo cuidado envia uma chave UUID de idempotência; duplo clique, retry de rede ou reenvio da mesma chave devolve o mesmo resultado, sem aplicar XP e atributos duas vezes. Um cuidado sem efeito é recusado — por exemplo, alimentar quando já está satisfeito — e brincar exige energia e saciedade mínimas. Os botões de cuidado ficam bloqueados enquanto o cuidado, a conversa, um rascunho, falha da conversa ou moderação estiverem ativos. Uma falha de cuidado permite tentar novamente. A consulta é sempre da sessão atual: não há ID de perfil na rota que permita ler o estado de outra conta.

Depois de 45 segundos sem conversa, cuidado ou rascunho, ele entra em ociosidade na pose do humor atual, sem usar a cama. A cama com travesseiro e coberta azul fica exclusiva do cuidado manual **Dormir**. Digitar, enviar ou iniciar um cuidado interrompe a ociosidade; respostas em andamento, falhas e moderação têm prioridade. Cada atividade solicitada permanece por oito segundos e todos os timers são liberados ao desmontar a tela.

Com **Animar personagem** desligado ou movimento reduzido no dispositivo, não há reprodução de quadros nem movimentos CSS. Ainda é possível cuidar manualmente do mascote e os atributos continuam sendo atualizados. A fala continua apenas visual, sem áudio. Na ação **Dormir**, Denkynho dorme na cama, alterna os dois lados e exibe `Z`, `Zz` e `Zzz`; a visualização sempre fica contida no quadro atual do atlas. Os botões são os componentes compartilhados do tema, com quebra de linha no celular.

As sequências mostram o lanche subindo, a mordida e a mastigação; mãos e controle mudando de posição durante a partida; boca, cabeça e braços mudando na risada; respiração, coberta e sorriso durante o sono na cama; passos e gesto na dança; esponja, espuma, água, toalha e brilho de limpeza no banho; alternância de pernas e braços na caminhada; espera ao pensar; e a comemoração de nível. [ActivitySprite](../../frontend/src/components/help/ActivitySprite.tsx) reproduz os quadros com durações próprias e ancoragem pela base, sem balançar a imagem inteira como substituto da ação. O balanço CSS da dança só aparece se o atlas não estiver em cena. [activitySequences.ts](../../frontend/src/components/help/activitySequences.ts) define os recortes e o ritmo. O atlas inteiro é carregado antes da troca; falhas preservam a imagem anterior. Na transição de saída, o quadro congela até desaparecer. Durante a fala, os recortes de boca originais têm prioridade; ao terminar, a ação recomeça. A preferência de movimento reduzido também é respeitada ao usar `Denkynho` fora da página.

Os testes de [ActivitySprite](../../frontend/src/components/help/ActivitySprite.test.tsx) percorrem todos os quadros e o retorno ao início, verificam os recortes visíveis, pausa e limpeza de timers. Os testes de Denkynho cobrem espera e falha do atlas, retomada, prioridade da fala e mudança de movimento reduzido. Consulte [Assets e sequências do Denkynho](denkynho-animacoes.md) para arquivos, coordenadas e prompts de geração.

As trocas de pose têm antecipação e acomodação, com ritmos diferentes para mudar de postura, virar, deitar e acordar. Nas visitas seguintes à mesma atividade, o personagem alterna o lado por uma virada animada; corpo, rosto e objetos são espelhados juntos. Não vira durante a fala nem ao repetir quadros do mesmo ciclo. Desativar animações interrompe a transição e mantém o lado atual. Pedidos rápidos mantêm só a próxima atividade mais recente, enquanto a conversa tem prioridade imediata. Veja [Transições e espelhamento](denkynho-animacoes.md#transições-e-espelhamento).

Cenários automatizados: carregamento do perfil, humor por necessidade e por empatia, cuidado bem-sucedido, bloqueio de duplo clique, payload idempotente, erro, retorno após oito segundos, ociosidade sem cama, movimento reduzido, tradução dos controles e carregamento das novas poses sem recortes faciais incompatíveis. No backend, a suíte cobre autenticação, propriedade por sessão, entrada inválida, limites, desgaste, repetição da mesma chave, detecção de sentimento e expiração da empatia. Consulte [HelpPage.test.tsx](../../frontend/src/pages/HelpPage.test.tsx), [test_denkynho_pet_api.py](../../backend/apps/content/tests/test_denkynho_pet_api.py), [test_denkynho_emotions.py](../../backend/apps/content/tests/test_denkynho_emotions.py) e [Denkynho.test.tsx](../../frontend/src/components/help/Denkynho.test.tsx).

Assets criados com a ferramenta integrada de geração de imagens, usando a pose de boas-vindas como referência de identidade. Prompts: preservar rosto, cabelo, proporções, camisa preta, gravata azul e acabamento 3D; criar uma pose de corpo inteiro comendo um sanduíche e outra segurando um controle de videogame, em proporção 2:3, sem texto, cenário ou marca d'água. Uma edição posterior removeu o fundo quadriculado gerado e produziu canal alpha real. Arquivos finais: [11-comendo.png](../../frontend/public/mascot/denkynho/11-comendo.png) e [12-jogando.png](../../frontend/public/mascot/denkynho/12-jogando.png).

O componente também aceita as demais poses do manifesto para futuras respostas e interações. Pré-carrega as camadas antes da transição; se um arquivo falhar, mantém a pose anterior e informa o problema. Libera timers e callbacks ao desmontar. A fala é visual e não reproduz áudio. **Animar personagem** desliga os movimentos e mostra as respostas completas. A preferência do sistema por movimento reduzido tem precedência.

## Limites e extensão

- Mensagens de até 1.000 caracteres; consultas repetidas ficam bloqueadas durante envio e revelação.
- Uma falha não apaga o rascunho nem adiciona uma resposta de sucesso.
- Respostas são texto simples, sem execução de HTML recebido.
- O chat usa apenas a identidade básica da sessão; não consulta personagens, pagamentos, saldos ou outras informações particulares.
- O modelo de embeddings é baixado pelo Sentence Transformers no primeiro uso e mantido em memória pelo processo, somente quando `DENKYNHO_EMBEDDINGS_ENABLED` está ativo. Em `core.settings.production` o padrão é `false`. O backend instala PyTorch CPU (`torch==…+cpu`); o wheel padrão do PyPI no Linux traria CUDA e esgotaria o disco do Docker. Configure `DENKYNHO_EMBEDDING_MODEL` para usar outro modelo compatível; não coloque modelos nem segredos no frontend.

## Validação

Os testes de `HelpPage.test.tsx` usam Testing Library e simulam apenas HTTP e carregamento de imagens. Cobrem sessão reconhecida, idioma, filtro, personalidade, continuidade, envio pelo teclado, carregamento, sugestões, respostas, repetição, erro, base vazia, movimento reduzido, inatividade e fala. `moderation.test.ts` cobre caracteres invisíveis, leet, separadores, repetição e falsos positivos; `identity.test.ts` cobre jogador, equipe, superadministrador e nome de conta recusado. O backend verifica idioma, validação, anonimato, moderação, busca semântica simulada na fronteira do modelo, fallback explícito e autorização por audiência.

A revisão visual usa a página real e o catálogo com tema carregado em desktop e celular. Execute os comandos completos de [Testes e qualidade](../desenvolvimento/testes.md) antes de entregar mudanças.

## Cenários de validação

Teste uma sequência em PT e EN: apresentação → correção do assunto → nome preferido → pergunta sobre esse nome → dúvida de senha. Verifique continuidade, resposta relacionada ao turno atual, expressão compatível e fonte apenas na orientação factual. Teste também tema ausente do FAQ, tentativas de forjar cargo, apelido ofensivo, modelo desligado e nova conversa.

Os testes de `test_chat.py` simulam somente o SDK Ollama, a API remota e o modelo de embeddings. Cobrem histórico, isolamento por identidade/papel/idioma, assinatura/expiração, limites, fontes autorizadas, moderação, erros, contrato do Ollama e da API remota. `test_start_denkynho.py` cobre inicialização local, provedor remoto sem boot do Ollama e as migrações de privacidade. A UI testa HTTP, contexto entre turnos, reinício, idioma, modo limitado, recuperação, `engine: remote` e respostas inválidas, além das interações e animações existentes.

### Verificação local em 04/09/2026

Com Qwen 3.5 4B em CPU (i5-10500T, 24 GB de RAM), o fluxo completo respondeu a “Pode me chamar de Dani. Hoje estou cansado.” com pose de sono, lembrou “Seu apelido é Dani, como você pediu.” com pose neutra e atendeu “mas eu pedi pra vc me falar sobre voce” com apresentação própria. Os três resultados vieram com `engine: ollama`, `kind: social`, sem fonte de FAQ. A execução inicial levou aproximadamente 97 segundos, incluindo carga das bibliotecas/modelos; as duas seguintes levaram 38 e 18 segundos. Uma pergunta em inglês sobre senha recebeu a orientação e o ID correto do FAQ, com pose de dica, em 47 segundos. Esses exemplos não garantem qualidade ou latência para todas as perguntas.

Passaram 829 testes do backend (85,57% de cobertura), 699 do frontend (71% de statements), typecheck, build, verificações Django e auditoria de dependências. A suíte do frontend foi executada com `npm run test:coverage -- --maxWorkers=1` para evitar disputa de memória com o modelo; o paralelismo padrão havia causado timeouts. O Ruff dos arquivos alterados passou; a verificação global ainda aponta 575 ocorrências preexistentes em outras partes do projeto. A auditoria de repetição não encontrou grupos candidatos.

### Cenários do Denkynho

O jardim encantado está disponível desde o nível 1. A biblioteca (nível 4) e o acampamento (nível 5) acrescentam livros, plantas, barraca, fogueira e lanterna ao ambiente. O armário apresenta prévias e permite selecionar ou retirar o cenário sem custo. O fundo permanece parado durante as poses e a dança; o broche acompanha o personagem.

O lenço foi retirado. Perfis antigos com lenço passam a exibir a biblioteca; com lanterna, o acampamento tem prioridade. Essa compatibilidade é aplicada na leitura e persistida na próxima troca, preservando XP e nível. Uma seleção explicitamente vazia mantém o personagem sem cenário. A API aceita `slot: "scene"` e `item_id: "garden"`, `"study"`, `"camp"` ou `""`; níveis e propriedade são verificados no servidor.

As imagens são pré-carregadas; enquanto uma troca não conclui ou falha, o cenário anterior permanece. Testes cobrem compatibilidade, níveis, remoção, isolamento entre contas, repetição, HTTP, prévias e carregamentos fora de ordem.

Arte original gerada com a ferramenta ImageGen em 04/09/2026, arquivos em `frontend/public/mascot/denkynho/scenes/`. Direção comum: ambiente quadrado em 3D estilizado, perspectiva frontal, centro livre para o mascote, objetos nas laterais e ao fundo, sem pessoas, texto ou marca d’água. Prompts de ambiente:

- `garden.png`: jardim encantado ao pôr do sol, piso de pedra com musgo, flores azuis, banco de madeira, vasos de barro, fonte redonda e arco com hera; verde, mel e azul suave.
- `study.png`: biblioteca acolhedora, piso de madeira, estantes curvas, mesa com livros e globo iluminado à esquerda, poltrona com manta azul e samambaia à direita, janela em arco; madeira, âmbar e azul escuro.
- `camp.png`: acampamento na floresta ao anoitecer, clareira, barraca à esquerda com mochila e cobertor, fogueira de pedras e lanterna à direita, pinheiros, montanhas e estrelas; azul marinho, verde e âmbar.

O cenário acompanha a proporção vertical 2:3 do personagem. No desktop, a área chega a 280 × 420 px, com coluna de até 300 px e margens internas menores. No celular, fundo e área arrastável medem 80 × 120 px. A revisão responsiva deve conferir essas dimensões no navegador, ausência de faixa descoberta e personagem inteiro.

No menu, as ações de preferências ficam junto aos campos. O rodapé de ajuda rápida reúne FAQ, dica e conversa, com divisória e alinhamento à esquerda. Os controles mantêm sua altura e quebram linha apenas quando a largura disponível exige.

Os fundos aparecem em um carrossel com uma prévia por vez. As setas percorrem o catálogo em ciclo e começam pelo fundo equipado. Navegar apenas muda a prévia; a seleção só é salva pelo botão Usar/Retirar. Cenários bloqueados continuam mostrando o nível necessário.
