# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Acessar e conversar

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Em desktop, a tela ocupa a altura da janela: o histórico da conversa é a única área com rolagem. O cabeçalho permanece compacto e o campo de mensagem fica visível. Escreva uma dúvida e pressione **Enter** para enviar; **Shift+Enter** quebra a linha. Você também pode filtrar as sugestões por assunto ou escolher uma pergunta. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Ver orientação completa** abre os detalhes do artigo; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho reconhece o usuário da sessão e informa se está conversando com jogador, equipe ou superadministrador. Sugere o primeiro nome de exibição e pergunta como a pessoa prefere ser chamada; o apelido só passa a ser usado depois de uma resposta válida. A pessoa pode conversar em português ou inglês. O frontend envia cada mensagem aceita ao endpoint autenticado `POST /api/v1/shared/content/assistant/reply/`. A mensagem é interpretada na requisição e não é gravada. O histórico e o apelido são temporários e desaparecem ao sair da tela ou recarregá-la.

A rota autenticada filtra o conhecimento no backend: jogadores recebem artigos públicos; moderadores, staff e administradores recebem também artigos da equipe; superadministradores recebem todos os níveis. A interface apenas apresenta o resultado autorizado. A API pública `GET /api/v1/public/faq/` continua retornando exclusivamente artigos públicos, mesmo quando chamada por uma pessoa autenticada.

## Conversa com modelo local

A camada de conversa foi inspirada na separação entre personalidade, memória e provedor do Ashley. O Denkynho usa o SDK **Ollama** e **Pydantic** para gerar e validar respostas, com um modelo local. O FAQ permanece como fonte editorial. Não há integração com Gemini, OpenAI ou outro serviço de geração na nuvem.

Toda mensagem aceita pelo filtro do navegador vai ao endpoint autenticado com `conversation: true` e `context`, inclusive cumprimentos e correções. O backend verifica moderação e identidade, recupera o contexto assinado, seleciona até três artigos autorizados e pede uma resposta ao modelo. O resultado inclui texto, tipo, pose e, quando aplicável, uma referência válida ao FAQ. Fontes inventadas, JSON inválido, texto vazio ou ofensivo e poses desconhecidas são recusados.

O prompt de personalidade está em [chat.py](../../backend/apps/content/application/chat.py). Define um assistente simpático, curioso, com humor leve, respostas breves e transparência sobre ser virtual. Ele considera o histórico para resolver referências, mudar de assunto e reparar interpretações erradas. Risadas, tristeza, conquistas e preferências de nome ou de detalhe são interpretadas pelo modelo; não dependem de cadastrar cada frase. Não deve cobrar atenção de quem ficou ausente nem terminar toda fala com uma pergunta.

O modelo recebe o nome básico da conta e o papel calculado no backend. Não recebe e-mail, credenciais, saldos ou acesso a ferramentas. Artigos de staff/superadmin são filtrados antes da busca e antes de construir o prompt. Alegar um cargo na mensagem não altera permissões. O texto gerado ainda pode conter imprecisões: mantenha o FAQ atualizado e encaminhe situações individuais ao Atendimento.

## Contexto e privacidade

O servidor devolve um token assinado com até 12 mensagens recentes, limitado também a aproximadamente 6.000 caracteres de histórico. O token é legível, não é criptografado e fica apenas no estado desta tela; não vai para localStorage nem para uma tabela de conversas. Expira após 30 minutos e é vinculado ao usuário, papel e idioma. Token alterado, expirado ou de outra identidade é descartado. A preferência de nome é mantida separadamente no token durante a conversa, mesmo depois de os primeiros turnos saírem da janela. O modelo propõe a preferência; o backend só aceita um nome de até 30 caracteres presente literalmente na mensagem atual e aprovado pelo filtro. Não é memória permanente do perfil.

**Nova conversa**, recarregar/sair da tela, trocar idioma ou identidade limpa o contexto do navegador. Respostas em trânsito de uma identidade anterior são descartadas. Mensagens recusadas pelo filtro não entram no histórico. O texto e o histórico recente são enviados ao backend e ao Ollama local (loopback ou rede Docker), sem envio a IA na nuvem; não envie senhas ou códigos. O PDL não registra transcrições no banco nem inclui prompts em logs de falha do modelo.

## Configurar e iniciar

1. Instale [Ollama](https://docs.ollama.com/windows) no computador que executa o backend.
2. Baixe o modelo: `ollama pull qwen3.5:4b`.
3. No `.env` do PDL, configure:

```dotenv
DENKYNHO_LLM_ENABLED=true
DENKYNHO_OLLAMA_URL=http://127.0.0.1:11434
DENKYNHO_LLM_MODEL=qwen3.5:4b
DENKYNHO_LLM_TIMEOUT=120
```

O `start-dev.bat` instala as dependências do Python e chama `manage.py start_denkynho`. O comando reutiliza um Ollama ativo ou procura o executável no PATH e em `%LOCALAPPDATA%/PDL/ollama/ollama.exe`. Quando inicia um processo, usa loopback, `OLLAMA_NO_CLOUD=1` e nenhuma janela extra. Não baixa modelos no boot. Instalações fora desses caminhos devem disponibilizar `ollama` no PATH. Falhas são informadas e o restante do PDL continua com ajuda básica.

O adaptador aceita endereços de loopback HTTP e, com a configuração Docker explícita descrita abaixo, o serviço `http://ollama:11434`. Ignora proxies do ambiente e não segue redirecionamentos. Tags de nuvem e caminhos remotos são recusados. Na instalação local de desenvolvimento, o runtime portátil 0.33.3 foi verificado com o SHA-256 publicado pelo projeto e instalado em `%LOCALAPPDATA%/PDL/ollama`; os pesos ficam no armazenamento padrão do Ollama, fora do repositório.

O modelo de 4 bilhões de parâmetros pode rodar em CPU, mas a velocidade depende do hardware e da carga; não promete resposta instantânea. O prazo configurado limita a espera pelo servidor de geração, sem retries automáticos. A primeira carga do modelo semântico e do gerador pode demorar mais.

A saída usa [JSON estruturado do Ollama](https://docs.ollama.com/capabilities/structured-outputs). O runtime recebe o esquema sem os limites grandes de comprimento, que podem gerar gramática incompatível; o orçamento de tokens limita a geração e Pydantic aplica o limite de 2.000 caracteres depois.

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

Desabilitar a geração, atingir timeout ou receber uma saída inválida resulta em `mode: limited`, com aviso visível na tela. A consulta usa **Lingua**, **Sentence Transformers** e **RapidFuzz**, e as interações sociais usam o repertório editorial existente. Este modo é limitado e não é apresentado como conversa generativa. As mensagens seguintes tentam novamente o modelo; uma resposta válida remove o aviso.

A API antiga, sem `conversation: true`, mantém o contrato de busca editorial. Perguntas com correspondência segura recebem resposta curta, detalhes e fonte; as demais pedem esclarecimento. [dialogue.ts](../../frontend/src/components/help/dialogue.ts) e [personality.ts](../../frontend/src/components/help/personality.ts) mantêm o repertório de contingência e as boas-vindas.

**Atendimento da equipe** abre `/painel/support`, sem criar chamado nem enviar o histórico automaticamente.

## Catálogo inicial

A migration `content.0004_seed_pdl_faq` publica 38 orientações em oito assuntos: primeiros passos; conta e segurança; contas e personagens; carteira e inventário; loja e comércio; jogos e recompensas; conteúdo e comunidade; ajuda e atendimento. O catálogo cobre os módulos disponíveis no PDL sem fixar preços, taxas, limites ou prazos configuráveis. IDs determinísticos permitem reaplicar a carga e removê-la no rollback sem atingir artigos criados pela administração.

A migration `content.0009_seed_english_faq` acrescenta as versões em inglês dos 38 artigos públicos e quatro artigos internos. A página pública `/faq` permite trocar o idioma, buscar em pergunta, resposta e palavras-chave e filtrar por assunto. As rotas de FAQ aceitam `?lang=pt` ou `?lang=en`; a API também retorna `language`, `audience` e `audience_label`. O Django Admin permite editar as duas versões e publicar cada artigo para todos, para a equipe ou somente para superadministradores.

## Moderação da conversa

O filtro foi adaptado do serviço de moderação do HollowDuel. Antes de exibir ou interpretar uma mensagem, ele remove caracteres invisíveis e acentos, converte substituições comuns como `0` por `o`, ignora pontuação usada entre letras e reconhece repetições e letras separadas. A correspondência respeita limites de palavra para não bloquear termos legítimos que apenas contêm a mesma sequência.

Mensagens recusadas no navegador não são adicionadas ao histórico, não consultam a API e não podem definir o apelido. O backend repete a validação em português e inglês antes de executar a busca, impedindo contorno por outro cliente. A tela apresenta um erro claro e permite reformular. A lista é curta e própria para a conversa de ajuda; qualquer ampliação deve incluir casos bloqueados, tentativas de contorno e falsos positivos nos testes.

## Animações

O componente [Denkynho](../../frontend/src/components/help/Denkynho.tsx) recebe `pose`, `talking`, `mouthOpen` e `animated`. Os assets PNG transparentes ficam em `frontend/public/mascot/denkynho/`. O manifesto [poses.json](../../frontend/src/components/help/poses.json) relaciona dez poses e os recortes dos olhos e da boca. A base de 512 × 768 ocupa todo o quadro; as coordenadas dos recortes usam o espaço lógico de 256 × 384 e são convertidas em porcentagem.

| Estado da conversa | Comportamento |
| --- | --- |
| Boas-vindas e conversa social | Pose definida pela intenção, fala, respiração e piscadas |
| Consultando | Pose pensando |
| Resposta publicada | Pose de dica ou continuidade da emoção recente; boca acompanha ritmo e pontuação |
| Sem correspondência | Pose confusa |
| Falha de consulta | Pose triste e rascunho preservado |
| 45 segundos sem interação | Dorme; digitar ou enviar desperta o personagem |

O componente também aceita as demais poses do manifesto para futuras respostas e interações. Pré-carrega as camadas antes da transição; se um arquivo falhar, mantém a pose anterior e informa o problema. Libera timers e callbacks ao desmontar. A fala é visual e não reproduz áudio. **Animar personagem** desliga os movimentos e mostra as respostas completas. A preferência do sistema por movimento reduzido tem precedência.

## Limites e extensão

- Mensagens de até 1.000 caracteres; consultas repetidas ficam bloqueadas durante envio e revelação.
- Uma falha não apaga o rascunho nem adiciona uma resposta de sucesso.
- Respostas são texto simples, sem execução de HTML recebido.
- O chat usa apenas a identidade básica da sessão; não consulta personagens, pagamentos, saldos ou outras informações particulares.
- O modelo de embeddings é baixado pelo Sentence Transformers no primeiro uso e mantido em memória pelo processo. Configure `DENKYNHO_EMBEDDING_MODEL` para usar outro modelo compatível; não coloque modelos nem segredos no frontend.

## Validação

Os testes de `HelpPage.test.tsx` usam Testing Library e simulam apenas HTTP e carregamento de imagens. Cobrem sessão reconhecida, idioma, filtro, personalidade, continuidade, envio pelo teclado, carregamento, sugestões, respostas, repetição, erro, base vazia, movimento reduzido, inatividade e fala. `moderation.test.ts` cobre caracteres invisíveis, leet, separadores, repetição e falsos positivos; `identity.test.ts` cobre jogador, equipe, superadministrador e nome de conta recusado. O backend verifica idioma, validação, anonimato, moderação, busca semântica simulada na fronteira do modelo, fallback explícito e autorização por audiência.

A revisão visual usa a página real e o catálogo com tema carregado em desktop e celular. Execute os comandos completos de [Testes e qualidade](../desenvolvimento/testes.md) antes de entregar mudanças.

## Cenários de validação

Teste uma sequência em PT e EN: apresentação → correção do assunto → nome preferido → pergunta sobre esse nome → dúvida de senha. Verifique continuidade, resposta relacionada ao turno atual, expressão compatível e fonte apenas na orientação factual. Teste também tema ausente do FAQ, tentativas de forjar cargo, apelido ofensivo, modelo desligado e nova conversa.

Os testes de `test_chat.py` simulam somente o SDK e o modelo de embeddings. Cobrem histórico, isolamento por identidade/papel/idioma, assinatura/expiração, limites, fontes autorizadas, moderação, erros e contrato do Ollama. `test_start_denkynho.py` cobre inicialização e a migração de privacidade. A UI testa HTTP, contexto entre turnos, reinício, idioma, modo limitado, recuperação e respostas inválidas, além das interações e animações existentes.

### Verificação local em 04/09/2026

Com Qwen 3.5 4B em CPU (i5-10500T, 24 GB de RAM), o fluxo completo respondeu a “Pode me chamar de Dani. Hoje estou cansado.” com pose de sono, lembrou “Seu apelido é Dani, como você pediu.” com pose neutra e atendeu “mas eu pedi pra vc me falar sobre voce” com apresentação própria. Os três resultados vieram com `engine: ollama`, `kind: social`, sem fonte de FAQ. A execução inicial levou aproximadamente 97 segundos, incluindo carga das bibliotecas/modelos; as duas seguintes levaram 38 e 18 segundos. Uma pergunta em inglês sobre senha recebeu a orientação e o ID correto do FAQ, com pose de dica, em 47 segundos. Esses exemplos não garantem qualidade ou latência para todas as perguntas.

Passaram 829 testes do backend (85,57% de cobertura), 699 do frontend (71% de statements), typecheck, build, verificações Django e auditoria de dependências. A suíte do frontend foi executada com `npm run test:coverage -- --maxWorkers=1` para evitar disputa de memória com o modelo; o paralelismo padrão havia causado timeouts. O Ruff dos arquivos alterados passou; a verificação global ainda aponta 575 ocorrências preexistentes em outras partes do projeto. A auditoria de repetição não encontrou grupos candidatos.
