# Ajuda e Denkynho

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Testes](../desenvolvimento/testes.md)

## Acessar e conversar

Entre no painel e abra **Ajuda** (`/painel/ajuda`). A rota usa a autenticação e o tema do painel. Escreva uma dúvida ou escolha uma pergunta sugerida. O histórico mostra a pergunta, a orientação e sua fonte. **Mostrar resposta completa** encerra a revelação gradual; **Nova conversa** limpa o histórico e o rascunho desta tela.

O Denkynho consulta as perguntas publicadas do FAQ usando o serviço existente, `GET /api/v1/public/faq/`. A seleção da orientação acontece no navegador: a pergunta digitada não é enviada a um provedor de IA nem gravada no backend. O histórico é temporário e desaparece ao sair da tela ou recarregá-la. Esta versão é uma interface de conversa sobre a base publicada, não um modelo generativo ou um atendimento humano.

A resposta é exibida integralmente como cadastrada, identificando a pergunta de origem. A busca remove acentos e considera termos significativos do título. Só seleciona uma resposta por correspondência exata ou quando todos os termos significativos aparecem em uma única pergunta. Consultas ambíguas, sem correspondência ou com base vazia encaminham o usuário ao FAQ ou ao atendimento; nenhuma resposta é inventada.

**Atendimento da equipe** abre o fluxo de chamados já existente em `/painel/support`. Essa navegação não cria um chamado nem envia o histórico automaticamente. Publique perguntas e respostas pelo cadastro de FAQ existente no Django para alimentar as sugestões.

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

Os testes de `HelpPage.test.tsx` usam Testing Library e simulam apenas HTTP e carregamento de imagens. Cobrem carregamento, sugestões, resposta/fonte, nova conversa, consulta repetida, erro preservando rascunho, nova tentativa, dados inválidos, base vazia, movimento reduzido, inatividade e conclusão da fala. Os testes do componente verificam piscada, boca, transição, falha de asset e limpeza; os testes de respostas verificam correspondência, ambiguidade e validação. A árvore real de rotas inclui Ajuda.

A revisão visual usa a página real e o catálogo com tema carregado em desktop e celular; a fronteira HTTP é simulada com dados fictícios. Execute os comandos completos de [Testes e qualidade](../desenvolvimento/testes.md) antes de entregar mudanças. Não houve alteração do backend nem migração nesta funcionalidade.
