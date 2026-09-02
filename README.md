<h1 align="center">PDL PRO</h1>

<p align="center"><strong>O painel da sua comunidade Lineage 2.</strong><br>
Site público, área do jogador e central da equipe em uma aplicação.</p>

<p align="center">
  <a href="docs/README.md">Documentação</a> ·
  <a href="docs/primeiros-passos/docker.md">Começar</a> ·
  <a href="docs/desenvolvimento/ambiente-local.md">Desenvolver</a> ·
  <a href="docs/operacao/implantacao.md">Implantar</a>
</p>

---

O **PDL PRO 2.0** conecta a gestão do servidor à experiência dos jogadores: contas e personagens, economia, conteúdo, recompensas e atendimento. O backend Django e o frontend React são separados, com uma API versionada e módulos de negócio próprios.

> **Em desenvolvimento ativo.** Prepare e valide as integrações antes de liberar uma instalação para jogadores. O [guia de implantação](docs/operacao/implantacao.md) descreve esse processo.

## O que você encontra

| Área | Recursos |
| --- | --- |
| **Contas e acesso** | Cadastro, e-mail, recuperação de senha, 2FA, passkeys e vínculos Lineage |
| **Servidor e personagens** | Status, rankings, equipamentos, inventário e serviços de personagem |
| **Economia** | Carteira, pagamentos, loja, pacotes, cupons, marketplace e leilões |
| **Comunidade** | Notícias, wiki, calendário, notificações, apoiadores e suporte |
| **Recompensas** | Passe de batalha, bônus diário, pesca, caixas e minigames |
| **Equipe** | Configuração, relatórios financeiros, catálogo customizado e observação de itens |

Conheça os recursos e as diferenças em relação ao PDL 1.x na [visão geral do produto](docs/produto/visao-geral.md).

## Escolha seu próximo passo

| Quero… | Começar por… |
| --- | --- |
| Executar o painel pela primeira vez | [Início rápido com Docker](docs/primeiros-passos/docker.md) |
| Preparar o ambiente de desenvolvimento | [Execução local](docs/desenvolvimento/ambiente-local.md) |
| Entender ou criar uma funcionalidade | [Arquitetura](docs/arquitetura/visao-geral.md) e [guia dos apps](docs/arquitetura/apps.md) |
| Rodar ou escrever testes | [Testes e qualidade](docs/desenvolvimento/testes.md) |
| Conectar meu servidor Lineage | [Integração e dialetos](docs/integracoes/lineage.md) |
| Publicar e manter uma instalação | [Implantação](docs/operacao/implantacao.md) e [backup](docs/operacao/backup-e-restauracao.md) |

## Base técnica

**Django + DRF** · **React + TypeScript + Vite** · **PostgreSQL** · **Redis + Celery** · **Channels** · **MySQL Lineage opcional**

O banco do painel permanece separado do banco do jogo. Os detalhes da stack, dos contratos e da operação estão no [índice completo da documentação](docs/README.md).

## Participar

Leia o [guia de contribuição](docs/projeto/contribuicao.md) para propor mudanças e o [guia da documentação](docs/projeto/documentacao.md) para manter os conteúdos organizados. As versões estão no [changelog](docs/historico/changelog.md).

Relatos de vulnerabilidade seguem a [política de segurança](SECURITY.md).

---

Copyright © 2026 Daniel Amaral. Código disponível sob [licença source-available](LICENSE), com restrições à comercialização por terceiros. Consulte as [condições de uso](docs/projeto/licenca.md) e a licença completa.
