# Histórico de Versões (Changelog)

Este documento descreve a governança de versões, o padrão de registro de alterações e o ciclo de lançamentos do **PDL PRO**.

---

## Registro Canônico Completo

O histórico detalhado, consolidado por versão com todas as alterações do produto, segue na fonte única de documentação:

👉 **[Consultar Changelog Completo em docs/historico/changelog.md](docs/historico/changelog.md)**

---

## Diretrizes de Versionamento

O PDL PRO adota o [Versionamento Semântico 2.0.0 (SemVer)](https://semver.org/lang/pt-BR/), estruturado no formato `MAJOR.MINOR.PATCH`:

* **MAJOR (`X.0.0`)**: Mudanças incompatíveis com versões anteriores na API pública, quebras de contrato de banco de dados ou reestruturações arquiteturais que exijam intervenção manual na migração.
* **MINOR (`0.Y.0`)**: Novas funcionalidades, novos subsistemas, suporte a novos dialetos de emuladores ou expansão de portas e serviços, mantendo total retrocompatibilidade.
* **PATCH (`0.0.Z`)**: Correções de defeitos (bug fixes), endurecimento de segurança, ajustes de compatibilidade, melhorias de desempenho e atualizações de documentação.

A versão ativa da distribuição é centralizada no arquivo [version.json](version.json) e sincronizada automaticamente entre o backend Django, o frontend React e os scripts de empacotamento.

---

## Formato do Registro (Keep a Changelog)

O changelog segue a convenção internacional [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), organizada em seções temáticas padronizadas:

| Seção | Finalidade |
| :--- | :--- |
| **`Não publicado`** | Alterações integradas à branch principal aguardando o próximo corte de versão e empacotamento oficial. |
| **`Adicionado`** | Novas funcionalidades, novos componentes visuais, novas APIs e extensões de sistema. |
| **`Alterado`** | Modificações em contratos existentes, refinamentos de interface e melhorias em fluxos pré-existentes. |
| **`Corrigido`** | Resolução de bugs, correções de queries SQL, falhas de borda e inconsistências de validação. |
| **`Removido`** | Funcionalidades descontinuadas ou componentes obsoletos retirados do codebase. |
| **`Segurança`** | Endurecimento de políticas de cabeçalhos (CSP), criptografia, segredos e mitigação de vulnerabilidades. |

---

## Ciclo de Lançamento e Publicação

1. **Validação de Qualidade Obrigatória**: Todo lançamento exige 100% de aprovação na suíte de testes de backend (`pytest` com cobertura mínima), linter (`ruff`), verificação de migrations, tipagem TypeScript (`tsc`), testes de contratos e cobertura frontend (`vitest`).
2. **Corte e Tag Git**: Uma tag no formato `vX.Y.Z` (ex.: `v2.6.0`) dispara o pipeline automatizado em [.github/workflows/release.yml](.github/workflows/release.yml).
3. **Publicação Automatizada**:
   * Construção e envio das imagens de container seguras para o GitHub Container Registry (`ghcr.io`).
   * Geração do pacote de distribuição zipado `pdl-pro-X.Y.Z.zip` através de [scripts/pdl_release.py](scripts/pdl_release.py).
   * Disponibilização dos instaladores automatizados `install.sh` (Linux/Bash) e `install.ps1` (Windows/PowerShell) anexados à Release no GitHub.

Para obter orientações sobre implantação, atualização e distribuição em produção, consulte [docs/operacao/distribuicao.md](docs/operacao/distribuicao.md).
