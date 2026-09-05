# Denkynho: conversa, contexto e evolução

[Índice](../README.md) · [Guia da funcionalidade](../funcionalidades/ajuda.md)

Esta alteração acrescenta busca lexical ao chat generativo sem embeddings, preservação do contexto durante falhas, envio imediato da pergunta com rascunho independente, preferências opcionais por conta neste navegador, orientação contextual do painel, armário e interações por nível. O backend continua determinando permissões e propriedade; a IA não executa operações na conta.

## Validação

- Backend: `python -m pytest --cov --cov-report=term:skip-covered --cov-report=html --cov-report=json:coverage.json --cov-report=xml:coverage.xml` — 953 testes passaram; cobertura combinada de linhas e branches de 86,53%, acima do piso de 84%.
- Frontend: `npm run test:coverage -- --maxWorkers=1` — 761 testes passaram em 68 arquivos. Cobertura: statements 74%, branches 65,15%, funções 66,42% e linhas 76,06%; todos os pisos passaram. A página de Ajuda atingiu 91,57% de linhas e 86,03% de branches; `PetProgress` e o catálogo contextual atingiram 100% de linhas. O worker único preservou memória durante a validação completa.
- Arquivos do recurso: `chat.py` 96,20%, `assistant.py` 99,21%, `denkynho.py` 98,77%; aplicação, domínio e endpoint do armário com 100%. Os testes verificam autenticação, papel, propriedade, recusas, limites, repetição e rollback.
- `manage.py check --settings=core.settings.test` e `makemigrations --check --dry-run --settings=core.settings.test` passaram. A migração `content.0017` foi exercitada pela criação do banco de teste; deve ser aplicada no ambiente de implantação.
- `npm run typecheck` passou e `npm run build` concluiu. O build mantém o aviso de tamanho de chunk; a cópia do catálogo de assets contribui para seu tempo de execução.
- `python scripts/audit_reuse.py`: zero grupos candidatos. Links locais dos guias alterados conferidos.
- `python -m ruff check .`: 574 ocorrências no repositório. As pendências restantes nos arquivos modificados são cinco `RUF012` preexistentes nas opções `Meta.ordering` de outros modelos de conteúdo; os novos módulos e os trechos funcionais desta mudança não introduzem ocorrências. Nenhuma regra ou limite foi desabilitado.

As regressões de busca sem embeddings, perda de contexto e preferências ignoradas foram reproduzidas por testes que falharam antes da correção. No frontend, os testes de pergunta imediata e preservação do rascunho seguinte também falharam com o comportamento anterior e passaram com a implementação.

## Revisão visual e limites

A página real de Ajuda foi montada em `/denkynho.html` com tema, fontes, texturas e imagens do painel. Apenas a fronteira HTTP foi substituída por dados locais de demonstração. Foram conferidos desktop e viewport de 390 × 844, menu com rolagem própria, campos, aparência, envio e navegação. No celular, o botão de restaurar ocupa uma faixa própria, sem sobrepor o cabeçalho do chat ou o campo de mensagem; a largura de rolagem coincide com a viewport. O catálogo `/ui.html` também foi conferido.

Os testes não utilizaram credenciais reais, envio de e-mail, pagamentos, operações do servidor de jogo nem inferência real de IA. A revisão no navegador com dados demonstrativos não substitui homologação autenticada no ambiente de implantação ou medição da qualidade e latência do provedor configurado. A mudança não foi publicada em produção.
