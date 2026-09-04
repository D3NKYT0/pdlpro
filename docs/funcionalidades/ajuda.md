# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Acessar e conversar

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Em desktop, a tela ocupa a altura da janela: o histórico da conversa é a única área com rolagem. O cabeçalho permanece compacto e o campo de mensagem fica visível. Escreva uma dúvida e pressione **Enter** para enviar; **Shift+Enter** quebra a linha. Você também pode filtrar as sugestões por assunto ou escolher uma pergunta. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Ver orientação completa** abre os detalhes do artigo; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho reconhece o usuário da sessão e informa se está conversando com jogador, equipe ou superadministrador. Sugere o primeiro nome de exibição e pergunta como a pessoa prefere ser chamada; o apelido só passa a ser usado depois de uma resposta válida. A pessoa pode conversar em português ou inglês. Quando a mensagem não é uma interação social conhecida, o frontend envia a pergunta ao endpoint autenticado `POST /api/v1/shared/content/assistant/reply/`. A mensagem é interpretada na requisição e não é gravada. O histórico e o apelido são temporários e desaparecem ao sair da tela ou recarregá-la.

A rota autenticada filtra o conhecimento no backend: jogadores recebem artigos públicos; moderadores, staff e administradores recebem também artigos da equipe; superadministradores recebem todos os níveis. A interface apenas apresenta o resultado autorizado. A API pública `GET /api/v1/public/faq/` continua retornando exclusivamente artigos públicos, mesmo quando chamada por uma pessoa autenticada.

## Personalidade e padrão de fala

O Denkynho é um companheiro virtual jovem, gentil, curioso e seguro. Fala em português brasileiro ou inglês conforme o idioma selecionado, usa frases curtas e claras e faz referências leves a jornada e aventura. A resposta normalmente acolhe a fala, responde diretamente e convida para um próximo passo. Humor é leve e apropriado ao universo do PDL.

Ele se apresenta como assistente virtual e nunca afirma ser humano, acessar uma conta, conhecer dados particulares ou executar uma operação. Não inventa status, preço ou regra. Diante de tristeza, acolhe sem fazer diagnóstico; diante de agressão, mantém um limite respeitoso; quando não entende, pede outras palavras ou oferece as sugestões. A voz evita excesso de bordões, intimidade forçada, ironia e linguagem técnica desnecessária.

[personality.ts](../../frontend/src/components/help/personality.ts) centraliza as boas-vindas, a normalização e as intenções sociais. A camada reconhece mensagens curtas e completas para não interceptar dúvidas de conhecimento. As intenções cobertas são:

- cumprimento e “como vai?”;
- agradecimento, pedido de desculpa e despedida;
- nome, identidade, origem, capacidades e natureza virtual;
- alegria, tristeza, cansaço e confusão;
- sono, piada e limite para fala desrespeitosa.

Cada intenção define duas ou mais formulações quando a variação ajuda a evitar repetição, sem mudar o tom ou a informação. Conversas simples são respondidas sem uma nova requisição ao FAQ. Perguntas como “Como recupero minha senha?” continuam na camada de conhecimento.

## Continuidade da conversa

[dialogue.ts](../../frontend/src/components/help/dialogue.ts) mantém um estado imutável enquanto a tela está aberta. Ele registra o artigo e assunto atuais, opções de esclarecimento, número de tentativas, preferência de detalhe, nome informado e emoção recente. **Nova conversa** recria esse estado; nenhuma dessas informações é persistida ou enviada ao backend.

O motor entende continuações como “sim”, “não”, “e depois?”, “mais detalhes”, “não achei”, “deu erro” e “já tentei”. Quando mais de um artigo corresponde, pergunta qual caminho representa a dúvida e aceita a escolha pelo texto ou por “primeira”, “segunda” e “terceira”. Depois de uma tentativa que falhou, oferece uma revisão segura; na repetição, encaminha ao atendimento sem sugerir que pagamentos, saldos ou itens sejam repetidos.

“Prefiro respostas curtas” oculta a segunda camada nas respostas seguintes. “Quero respostas detalhadas” apresenta diretamente o artigo completo. “Pode me chamar de …” guarda um nome de até 30 caracteres apenas nesta conversa e o usa com moderação. Apelidos recusados nunca entram no estado nem são repetidos pelo personagem. Perguntas de continuidade aparecem com intervalo mínimo para não terminar toda resposta com uma nova pergunta.

Emoções expressivas duram por até duas interações e diminuem gradualmente. [speech.ts](../../frontend/src/components/help/speech.ts) controla a velocidade de revelação: alegria e riso falam mais rápido, tristeza mais devagar e pontuação fecha a boca durante pausas. A saudação inicial respeita manhã, tarde ou noite do dispositivo.

Cada artigo tem camadas em português e inglês: assunto, resposta rápida, orientação completa e palavras-chave. O endpoint usa **Lingua** para detectar PT/EN quando o cliente pede detecção automática, **Sentence Transformers** com o modelo multilíngue `paraphrase-multilingual-MiniLM-L12-v2` para comparar significado e **RapidFuzz** para tolerar erros de escrita. A pontuação combina similaridade semântica e lexical e só seleciona uma resposta acima do limite de confiança e sem ambiguidade. Se o modelo semântico falhar, o contrato informa `engine: rapidfuzz` e aplica um limite lexical mais rigoroso. A primeira camada responde de forma curta; a segunda abre os detalhes; a terceira sugere até três artigos relacionados. Consultas sem relação com a base pedem mais detalhes; nenhuma resposta é inventada.

**Atendimento da equipe** abre o fluxo de chamados já existente em `/painel/support`. Essa navegação não cria um chamado nem envia o histórico automaticamente. O Django Admin permite editar assunto, resposta rápida, orientação, palavras-chave, ordem e publicação de cada FAQ.

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

## Correções de entendimento

Pedidos de apresentação em PT/EN, inclusive abreviações como “vc”, são separados
das perguntas sobre personagens do jogo. Exemplos sociais também concorrem com
o FAQ no modelo multilíngue; exemplos da mesma intenção são agrupados antes da
comparação de confiança. Uma correção como “mas eu pedi pra vc me falar sobre voce”
recebe um reconhecimento do engano e uma apresentação do Denkynho. Uma rejeição
sem novo assunto, como “não foi isso que eu perguntei”, pede esclarecimento.

Respostas sociais vindas do servidor não exibem fonte de FAQ e limpam a referência
ao artigo anterior. A busca semântica e o fallback lexical usam limites mais
conservadores para evitar respostas sem relação com a pergunta. Os testes incluem
as frases acima, PT/EN, perguntas legítimas sobre personagens e mensagens fora
do domínio. O modelo real foi exercitado com dúvidas de senha e personagens,
apresentações e uma pergunta de culinária, que deve ficar sem resposta no FAQ.
