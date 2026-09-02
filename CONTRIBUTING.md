# Como contribuir

Obrigado pelo interesse no PDL PRO. Este é um projeto de código publicamente disponível sob uma [licença source-available](LICENSE): o uso é permitido, mas a comercialização do PDL por terceiros é proibida. Contribuições externas precisam ser combinadas com o mantenedor antes do início do trabalho.

## Antes de começar

1. Confirme que a mudança é desejada por meio de uma issue ou conversa privada com o mantenedor.
2. Não publique credenciais, dados de jogadores, dumps de banco ou detalhes de vulnerabilidades.
3. Para falhas de segurança, siga exclusivamente a [política de segurança](SECURITY.md).
4. Leia a documentação de [desenvolvimento](docs/development.md) e [arquitetura](docs/architecture.md).

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
- Use comentários para justificar decisões pouco óbvias; evite apenas repetir o nome da classe ou descrever cada linha. Consulte os guias de [apps](backend/apps/README.md) e [common](backend/common/README.md).
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

## Validação mínima

Execute antes de abrir o pull request:

```powershell
cd backend
ruff check .
pytest

cd ..\frontend
npm run build
npm run test:run -- --passWithNoTests
```

O frontend ainda não possui arquivos de teste versionados, por isso a validação usa temporariamente `--passWithNoTests`. Ao adicionar a primeira suíte, remova essa opção do fluxo de contribuição e trate a ausência de testes como erro. Se outro comando não for aplicável à sua alteração ou estiver bloqueado pelo ambiente, registre isso claramente no pull request.

## Pull request

O pull request deve informar:

- o problema resolvido e a motivação;
- as decisões técnicas relevantes;
- mudanças de configuração, migrações ou compatibilidade;
- testes executados e seus resultados;
- capturas de tela para alterações visuais;
- plano de rollback quando houver risco operacional.

Ao enviar uma contribuição, você declara ter o direito de fornecê-la e concorda que ela poderá ser incorporada ao projeto sob a licença vigente do repositório. O envio não concede ao contribuidor direitos sobre outras partes do software.
