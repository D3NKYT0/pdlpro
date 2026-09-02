# Reutilização e revisão de código repetido

[Índice](../README.md) · [Arquitetura](visao-geral.md) · [Componentes frontend](../desenvolvimento/componentes.md)

Centralize código quando ele representa a mesma responsabilidade e precisa evoluir junto. Uma mudança na regra compartilhada deve chegar a todos os consumidores. A semelhança entre duas funções não autoriza misturar políticas, permissões ou transações de domínios diferentes.

## Responsabilidade de cada camada

| Local | O que compartilhar |
| --- | --- |
| `frontend/src/components/ui/` | Interação, semântica e apresentação básica |
| `frontend/src/components/<domínio>/` | Composições como atendimento, programas e itens |
| `frontend/src/hooks/` | Ciclo de ações sem repetir pending/erro/bloqueio |
| `frontend/src/lib/` | Formatação e interpretação pública de erros |
| `frontend/src/services/` | Contrato HTTP, sessão e chamadas de domínio |
| `backend/apps/<app>/domain/` | Regras puras do domínio |
| `backend/apps/<app>/application/` | Políticas e orquestração que pertencem ao app |
| `backend/apps/<app>/infrastructure/` | Comportamento comum dos modelos e adaptadores |
| `backend/common/` | Capacidades transversais, como DI, transação e documentação HTTP |

## Políticas consolidadas no backend

| Fonte | Consumidores e limites |
| --- | --- |
| [require_active_game](../../backend/apps/games/application/configuration.py) | Jogos e minijogos usam a mesma consulta e recusa de configuração inativa/ausente antes de consumir recursos |
| [require_offline_character](../../backend/apps/server/domain/character_rules.py) | Gateways SQLAlchemy e em memória validam personagem inexistente ou online com as mesmas exceções |
| [TitleSlugMixin](../../backend/apps/content/infrastructure/mixins.py) | News e WikiPage geram slug apenas quando vazio e preservam slugs publicados |
| [DocsChromeMixin](../../backend/common/openapi_views.py) | Swagger e ReDoc recebem o mesmo contexto visual |

A busca de personagem continua restrita a `login` e `char_id` no gateway. A regra compartilhada recebe o resultado autorizado; ela não resolve acesso. `TitleSlugMixin` não resolve colisões de slug nem altera as restrições do banco. Não houve alteração de campos ou necessidade de migração nesta extração.

Contratos abstratos de repositórios, construtores de DI, serializers de domínios diferentes e integração SQL não devem ser fundidos só porque algumas linhas se parecem. Preserve a propriedade dos registros e os limites transacionais.

## Auditoria reproduzível

Na raiz do projeto, com Python disponível:

```bash
python scripts/audit_reuse.py
python scripts/audit_reuse.py --json candidatos.json --limit 25
```

[audit_reuse.py](../../scripts/audit_reuse.py) é somente leitura, exceto pelo relatório JSON explicitamente pedido. Analisa corpos de funções Python por AST, ignorando docstrings e construtores, e janelas de 12 linhas normalizadas no frontend. Inclui `frontend/src` e o CSS das páginas do tema, além de `backend/apps` e `backend/common`; ignora testes e migrações no backend e testes no frontend.

Os limites de tamanho reduzem alertas sobre fragmentos triviais. O resultado não detecta toda duplicação: nomes diferentes, markup equivalente e políticas semelhantes ainda exigem revisão humana. Zero candidatos não significa ausência de repetição. O comando não é um gate que exige abstrair todo trecho semelhante.

## Revisão de uma nova tela

- Comece pelos componentes do [catálogo](../desenvolvimento/componentes.md) e pelos serviços existentes.
- Compare comportamento de envio, mensagens, paginação, estados vazios e teclado com telas equivalentes.
- Se dois trechos compartilham contrato, extraia a peça e migre os consumidores no mesmo trabalho.
- Mantenha layout e regras específicas do domínio na tela ou em sua pasta de componentes.
- Teste o componente e o fluxo das telas consumidoras; valide o tema real em desktop e celular.

A consolidação atual cobre as peças recorrentes identificadas. Layouts específicos de comércio, inventário, administração e programas continuam existindo. Tabelas e filtros com contratos diferentes devem ser avaliados por comportamento antes de ganhar uma abstração comum.
