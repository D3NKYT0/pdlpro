# Como manter a documentação

[← Índice](../README.md) · [Fonte única](fonte-unica.md) · [Contribuição](contribuicao.md)

> **Atualizado:** 25 de setembro de 2026

> [!IMPORTANT]
> `docs/` contém **apenas `.md`**. Sem PDF, scripts, imagens geradas ou
> binários. Callouts coloridos: veja [Fonte única](fonte-unica.md#formato-visual-github).

A documentação acompanha o código. O README do repositório apresenta o produto;
[docs/README.md](../README.md) é o índice; cada guia aprofunda **um** assunto
([mapa canônico](fonte-unica.md)).

## Pastas

| Pasta | Conteúdo |
| --- | --- |
| `produto/` | Visão do painel |
| `primeiros-passos/` | Docker de desenvolvimento local |
| `tutoriais/` | Passo a passo do operador (provedores) |
| `desenvolvimento/` | Ambiente, frontend, testes, i18n |
| `arquitetura/` | Camadas, apps, extensões, common |
| `api/` | Contratos HTTP |
| `configuracao/` | Variáveis de ambiente |
| `integracoes/` | Detalhe técnico Lineage/pagamentos/catálogo |
| `funcionalidades/` | Regras de produto |
| `operacao/` | Release, backup, segurança ops, problemas |
| `projeto/` | Contribuição, política de segurança, convenções |
| `historico/` | Changelog + registros **datados** (arquivo) |

> [!TIP]
> Auditorias e validações pontuais vão para `historico/AAAA-MM-DD-….md`, nunca
> para `desenvolvimento/`.

## Estrutura de um guia

```markdown
# Nome do assunto

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Guia relacionado](../operacao/distribuicao.md)

> **Atualizado:** 25 de setembro de 2026

> [!NOTE]
> Para quem é este guia e o que **não** cobre (com link para o canônico).

## Pré-requisitos
## Como fazer / Como usar
## Como conferir
## Problemas comuns
```

## Regras de escrita

- Explique o comportamento existente; marque planejamento como tal.
- Um assunto → um canônico ([fonte única](fonte-unica.md)); os outros só linkam.
- Segurança operacional → [operacao/seguranca.md](../operacao/seguranca.md).
- Relato de vulnerabilidade → [projeto/seguranca.md](seguranca.md).
- Exemplos com `seudominio.com` e dados fictícios.
- Declare se o comando roda na pasta da Release, em `backend/` ou no container.
- Atualize o [índice](../README.md) ao criar guia novo.
- Todo guia vivo leva `> **Atualizado:**` com a data da última revisão
  contra o código (não a data de criação do arquivo).
- Registre impacto no [changelog](../historico/changelog.md), não no
  `CHANGELOG.md` da raiz.

## Checklist ao mudar o código

1. Qual contrato/procedimento mudou?
2. Qual é o documento canônico?
3. Removi cópia desnecessária em outros guias?
4. Links e callouts renderizam no GitHub?
5. Changelog atualizado se for impacto público?
