# Como manter a documentação

[Índice](../README.md) · [Contribuição](contribuicao.md)

A documentação acompanha o código. O README principal apresenta o produto e encaminha o leitor; `docs/README.md` funciona como índice; cada guia aprofunda um assunto. Docstrings continuam junto às classes para explicar contratos durante o desenvolvimento.

## Onde colocar um novo conteúdo

| Pasta | Conteúdo |
| --- | --- |
| `produto/` | Visão do painel, recursos e limitações |
| `primeiros-passos/` | Caminhos curtos para a primeira execução |
| `desenvolvimento/` | Ambiente, frontend, testes e fluxos de implementação |
| `arquitetura/` | Responsabilidades, decisões, classes e contratos internos |
| `api/` | Autenticação, endpoints e contratos públicos |
| `configuracao/` | Referência de variáveis e comportamento dos ambientes |
| `integracoes/` | Lineage, pagamentos, catálogos e serviços externos |
| `funcionalidades/` | Regras e operação de recursos do produto |
| `operacao/` | Deploy, manutenção, diagnóstico e recuperação |
| `projeto/` | Contribuição, segurança, licença e convenções |
| `historico/` | Registros datados de validação e contexto de entregas |

Crie nomes descritivos em português, minúsculos, sem acentos e separados por hífen. Não crie arquivos genéricos como `novo.md`, `outros.md` ou `final-v2.md`. Uma nova categoria só precisa de README próprio quando isso ajudar a navegar por vários documentos; o índice central deve continuar listando todos os guias.

## Estrutura sugerida

```markdown
# Nome do assunto

[Índice](../README.md) · [Guia relacionado](outro-guia.md)

Explique a finalidade, para quem o guia serve e o escopo atual.

## Pré-requisitos

Informe ambiente, dependências e acesso necessários.

## Como usar

Mostre passos e exemplos com diretório de execução explícito.

## Como verificar

Descreva o resultado esperado e os testes pertinentes.

## Limites e diagnóstico

Explique restrições reais e encaminhe aos guias relacionados.
```

Adapte os títulos à necessidade. Uma referência de API pode usar tabelas de parâmetros; uma decisão de arquitetura pode descrever contexto, escolha e consequências. O modelo acima é ilustrativo: substitua o link de exemplo por um destino existente.

## Padrão de escrita

- Explique o comportamento existente. Marque planejamento e sugestões como tal.
- Use exemplos com dados fictícios, unidades explícitas e caminhos do repositório.
- Declare se o comando roda na raiz, em `backend/`, em `frontend/` ou em um container.
- Em procedimentos que alteram dados, diga qual ambiente é afetado e como conferir o resultado.
- Mantenha uma explicação principal por assunto. Outros documentos devem resumir e linkar, sem copiar páginas inteiras.
- Use links relativos para documentos e código. Ao mover um arquivo, ajuste os links de entrada, de saída e as âncoras.
- Guarde resultados datados em `historico/`, com ambiente e limitações. Não descreva uma homologação antiga como estado permanente.
- Nas docstrings, explique finalidade, uso, dependências e condições relevantes. Comentários devem justificar decisões pouco evidentes.

## Processo de atualização

1. Identifique qual contrato ou procedimento a mudança afetou.
2. Confira o comportamento no código, nas configurações e nos testes.
3. Atualize o documento principal e as docstrings relacionadas.
4. Inclua o novo guia no [índice](../README.md) e em pelo menos um caminho de leitura relevante.
5. Procure referências antigas ao renomear ou dividir arquivos.
6. Confira a renderização Markdown, links, tabelas e blocos de código.
7. Registre os comandos validados e as limitações da verificação no relato da mudança.

Para conferir alterações documentais na raiz:

```bash
git diff --check
rg --files docs -g '*.md'
```

Esses comandos verificam whitespace e listam documentos; não validam automaticamente todos os links. Abra os destinos relativos e as âncoras e confira se o índice inclui cada arquivo novo. Não execute deploy, restauração ou transações reais apenas para validar um exemplo documental.

## Próximas melhorias possíveis

Amplie os guias junto às funcionalidades, acrescente decisões arquiteturais quando houver escolhas relevantes e adote validação automática de Markdown/links quando o fluxo do projeto comportar isso. Esses itens são evolução proposta, não ferramentas de CI já instaladas.
