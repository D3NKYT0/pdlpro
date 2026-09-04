# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Acessar e conversar

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Escreva uma dúvida, filtre as sugestões por assunto ou escolha uma pergunta. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Ver orientação completa** abre os detalhes do artigo; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho responde primeiro pela camada local de personalidade. Quando a mensagem não é uma interação social conhecida, consulta as perguntas publicadas do FAQ usando o serviço existente, `GET /api/v1/public/faq/`. A seleção acontece no navegador: a pergunta digitada não é enviada a um provedor de IA nem gravada no backend. O histórico é temporário e desaparece ao sair da tela ou recarregá-la. Esta versão usa respostas definidas e a base publicada, não um modelo generativo ou um atendimento humano.

## Personalidade e padrão de fala

O Denkynho é um companheiro virtual jovem, gentil, curioso e seguro. Fala em português brasileiro, chama a pessoa de **você**, usa frases curtas e claras e faz referências leves a jornada e aventura. A resposta normalmente acolhe a fala, responde diretamente e convida para um próximo passo. Humor é leve e apropriado ao universo do PDL.

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

“Prefiro respostas curtas” oculta a segunda camada nas respostas seguintes. “Quero respostas detalhadas” apresenta diretamente o artigo completo. “Pode me chamar de …” guarda um nome de até 30 caracteres apenas nesta conversa e o usa com moderação. Perguntas de continuidade aparecem com intervalo mínimo para não terminar toda resposta com uma nova pergunta.

Emoções expressivas duram por até duas interações e diminuem gradualmente. [speech.ts](../../frontend/src/components/help/speech.ts) controla a velocidade de revelação: alegria e riso falam mais rápido, tristeza mais devagar e pontuação fecha a boca durante pausas. A saudação inicial respeita manhã, tarde ou noite do dispositivo.

Cada artigo tem assunto, resposta rápida, orientação completa e palavras-chave. A busca remove acentos e considera termos significativos do título e das palavras-chave. Só seleciona uma resposta por correspondência exata ou por uma correspondência completa e sem ambiguidade. A primeira camada responde de forma curta; a segunda abre os detalhes; a terceira sugere até três artigos relacionados. Consultas sem relação com a base encaminham o usuário ao FAQ ou ao atendimento; nenhuma resposta é inventada.

**Atendimento da equipe** abre o fluxo de chamados já existente em `/painel/support`. Essa navegação não cria um chamado nem envia o histórico automaticamente. O Django Admin permite editar assunto, resposta rápida, orientação, palavras-chave, ordem e publicação de cada FAQ.

## Catálogo inicial

A migration `content.0004_seed_pdl_faq` publica 38 orientações em oito assuntos: primeiros passos; conta e segurança; contas e personagens; carteira e inventário; loja e comércio; jogos e recompensas; conteúdo e comunidade; ajuda e atendimento. O catálogo cobre os módulos disponíveis no PDL sem fixar preços, taxas, limites ou prazos configuráveis. IDs determinísticos permitem reaplicar a carga e removê-la no rollback sem atingir artigos criados pela administração.

A página pública `/faq` permite buscar em pergunta, resposta e palavras-chave e filtrar por assunto. A API pública retorna `id`, `question`, `short_answer`, `answer`, `category`, `category_label` e `keywords`. Registros antigos recebem o assunto Primeiros passos e continuam válidos; preencha a resposta curta e as palavras-chave no admin para melhorar a conversa.

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
- O chat não consulta contas, personagens, pagamentos ou informações particulares.
- Uma futura integração de IA deve ter serviço e endpoint próprios, com autenticação, limites, privacidade, validação e testes. Não coloque chaves de provedores no frontend. Preserve o contrato visual do mascote e os componentes compartilhados.

## Validação

Os testes de `HelpPage.test.tsx` usam Testing Library e simulam apenas HTTP e carregamento de imagens. Cobrem personalidade e continuidade sem nova consulta HTTP, carregamento, assuntos, sugestões, resposta rápida, orientação completa, fonte, nova conversa, consulta repetida, erro preservando rascunho, nova tentativa, dados inválidos, base vazia, movimento reduzido, inatividade e conclusão da fala. `personality.test.ts` fixa o padrão de voz, variações, período do dia, poses, intenções e a separação entre conversa e conhecimento. `dialogue.test.ts` cobre nome, preferências, referências, esclarecimento, tentativas e continuidade emocional; `speech.test.ts` cobre ritmo e pausas. `FaqPage.test.tsx` cobre busca, filtro e acordeão. O backend verifica o contrato público e os 38 artigos da migration.

A revisão visual usa a página real e o catálogo com tema carregado em desktop e celular. Execute os comandos completos de [Testes e qualidade](../desenvolvimento/testes.md) antes de entregar mudanças.
