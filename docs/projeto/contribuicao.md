# Como contribuir

[← Índice da documentação](../README.md)

Obrigado pelo interesse no PDL PRO. Este é um projeto de código publicamente disponível sob uma [licença source-available](../../LICENSE): o uso é permitido, mas a comercialização do PDL por terceiros é proibida. Contribuições externas precisam ser combinadas com o mantenedor antes do início do trabalho.

## Antes de começar

1. Confirme que a mudança é desejada por meio de uma issue ou conversa privada com o mantenedor.
2. Não publique credenciais, dados de jogadores, dumps de banco ou detalhes de vulnerabilidades.
3. Para falhas de segurança, siga exclusivamente a [política de segurança](seguranca.md).
4. Leia a documentação de [desenvolvimento](../desenvolvimento/ambiente-local.md) e [arquitetura](../arquitetura/visao-geral.md).

## Fluxo sugerido

1. Crie uma branch curta a partir da branch principal.
2. Mantenha cada alteração focada em um único objetivo.
3. Preserve as fronteiras entre domínio, aplicação, infraestrutura e apresentação.
4. Inclua ou atualize testes para toda mudança de comportamento.
5. Atualize o README, a documentação e o changelog quando houver impacto público.
6. Abra o pull request explicando contexto, solução, riscos e como a mudança foi validada.

Nomes de branch recomendados: `feature/...`, `fix/...`, `docs/...` e `refactor/...`.

## Padrões do projeto

### Backend

- Documente classes públicas com docstrings em português: responsabilidade, uso, entradas/retornos relevantes e efeitos colaterais. Explique unidades, permissões exigidas e limites transacionais quando fizerem parte do contrato.
- Use comentários para justificar decisões pouco óbvias; evite apenas repetir o nome da classe ou descrever cada linha. Consulte os guias de [apps](../arquitetura/apps.md) e [common](../arquitetura/common.md).
- Regras de negócio entram por classes de caso de uso.
- O domínio não depende de Django, DRF, SQLAlchemy ou detalhes HTTP.
- Interfaces ficam no domínio; adaptadores concretos ficam em infraestrutura.
- Views devem validar a requisição, resolver o caso de uso e montar a resposta.
- SQL do Lineage 2 permanece nos catálogos de consulta, nunca em views ou no frontend.
- Identificadores públicos de entidades do painel devem preferir UUID.

### Frontend

- Páginas consomem os serviços exportados por `frontend/src/services/api.ts`.
- HTTP, CSRF, cookies e renovação de sessão permanecem em `services/infra/`.
- Evite chamadas `fetch` diretas em páginas e componentes.
- Estados de carregamento, vazio e erro devem ser explícitos.
- Preserve o tema `default` e use `data-theme-surface`/`data-theme-part` ao ampliar pontos
  de personalização; não acople telas diretamente a um pacote instalado.
- Não versione `frontend/theme-packages/` nem `backend/media/`. Alterações no renderer ou
  no manifesto exigem testes de contrato, interação e conferência em desktop/celular.

## Validação mínima

Os testes são obrigatórios para novas features e correções, conforme [AGENTS.md](../../AGENTS.md) e a [política de testes](../desenvolvimento/politica-de-testes.md). Uma mudança que atinge backend e frontend precisa de evidências das duas camadas. Correções devem incluir um teste de regressão que reproduza o defeito.

Execute antes de abrir o pull request:

```powershell
cd backend
python -m ruff check .
python -m pytest --cov
python manage.py check --settings=core.settings.test
python manage.py makemigrations --check --dry-run --settings=core.settings.test

cd ..\frontend
npm run build
npm run typecheck
npm run test:coverage
```

O frontend já possui testes Vitest. Não use `--passWithNoTests` para ocultar problemas de descoberta. Consulte [Testes e qualidade](../desenvolvimento/testes.md) para execução por arquivo, cobertura e limitações da suíte. Se outro comando não for aplicável à sua alteração ou estiver bloqueado pelo ambiente, registre isso claramente no pull request.

## Pull request

O pull request deve informar:

- o problema resolvido e a motivação;
- as decisões técnicas relevantes;
- mudanças de configuração, migrações ou compatibilidade;
- testes executados e seus resultados;
- capturas de tela para alterações visuais;
- plano de rollback quando houver risco operacional.

Ao enviar uma contribuição, você declara ter o direito de fornecê-la e concorda que ela poderá ser incorporada ao projeto sob a licença vigente do repositório. O envio não concede ao contribuidor direitos sobre outras partes do software.
