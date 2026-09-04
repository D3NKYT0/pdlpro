# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Acessar e conversar

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Escreva uma dúvida, filtre as sugestões por assunto ou escolha uma pergunta. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Ver orientação completa** abre os detalhes do artigo; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho consulta as perguntas publicadas do FAQ usando o serviço existente, `GET /api/v1/public/faq/`. A seleção da orientação acontece no navegador: a pergunta digitada não é enviada a um provedor de IA nem gravada no backend. O histórico é temporário e desaparece ao sair da tela ou recarregá-la. Esta versão é uma interface de conversa sobre a base publicada, não um modelo generativo ou um atendimento humano.

Cada artigo tem assunto, resposta rápida, orientação completa e palavras-chave. A busca remove acentos e considera termos significativos do título e das palavras-chave. Só seleciona uma resposta por correspondência exata ou por uma correspondência completa e sem ambiguidade. A primeira camada responde de forma curta; a segunda abre os detalhes; a terceira sugere até três artigos relacionados. Consultas sem relação com a base encaminham o usuário ao FAQ ou ao atendimento; nenhuma resposta é inventada.

**Atendimento da equipe** abre o fluxo de chamados já existente em `/painel/support`. Essa navegação não cria um chamado nem envia o histórico automaticamente. O Django Admin permite editar assunto, resposta rápida, orientação, palavras-chave, ordem e publicação de cada FAQ.

## Catálogo inicial

A migration `content.0004_seed_pdl_faq` publica 38 orientações em oito assuntos: primeiros passos; conta e segurança; contas e personagens; carteira e inventário; loja e comércio; jogos e recompensas; conteúdo e comunidade; ajuda e atendimento. O catálogo cobre os módulos disponíveis no PDL sem fixar preços, taxas, limites ou prazos configuráveis. IDs determinísticos permitem reaplicar a carga e removê-la no rollback sem atingir artigos criados pela administração.

A página pública `/faq` permite buscar em pergunta, resposta e palavras-chave e filtrar por assunto. A API pública retorna `id`, `question`, `short_answer`, `answer`, `category`, `category_label` e `keywords`. Registros antigos recebem o assunto Primeiros passos e continuam válidos; preencha a resposta curta e as palavras-chave no admin para melhorar a conversa.

## Animações

O componente [Denkynho](../../frontend/src/components/help/Denkynho.tsx) recebe `pose`, `talking`, `mouthOpen` e `animated`. Os assets PNG transparentes ficam em `frontend/public/mascot/denkynho/`. O manifesto [poses.json](../../frontend/src/components/help/poses.json) relaciona dez poses e os recortes dos olhos e da boca. A base de 512 × 768 ocupa todo o quadro; as coordenadas dos recortes usam o espaço lógico de 256 × 384 e são convertidas em porcentagem.

| Estado da conversa | Comportamento |
| --- | --- |
| Boas-vindas | Sorriso, respiração e piscadas |
| Consultando | Pose pensando |
| Resposta publicada | Pose de dica e boca acompanhando o texto |
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

Os testes de `HelpPage.test.tsx` usam Testing Library e simulam apenas HTTP e carregamento de imagens. Cobrem carregamento, assuntos, sugestões, resposta rápida, orientação completa, fonte, nova conversa, consulta repetida, erro preservando rascunho, nova tentativa, dados inválidos, base vazia, movimento reduzido, inatividade e conclusão da fala. `FaqPage.test.tsx` cobre busca, filtro e acordeão. Os testes do componente verificam piscada, boca, transição, falha de asset e limpeza; os testes de respostas verificam palavras-chave, camadas, relacionados, ambiguidade e validação. O backend verifica o contrato público e os 38 artigos da migration.

A revisão visual usa a página real e o catálogo com tema carregado em desktop e celular. Execute os comandos completos de [Testes e qualidade](../desenvolvimento/testes.md) antes de entregar mudanças.
