# Componentes compartilhados do backend

[← Índice da documentação](../README.md)

`common` reúne contratos e infraestrutura reutilizados pelos apps. Coloque aqui mecanismos transversais; regras específicas de carteira, inventário ou pagamento pertencem ao app responsável. As docstrings das classes e dos métodos públicos detalham os contratos de uso.

## Injeção de dependências

`AppProvider.register(container)` associa interfaces a implementações. Cada `AppConfig.ready()` adiciona seu provider ao `DependencyInjection`; a raiz é composta no primeiro acesso. O middleware abre um container filho por requisição, que `InjectedAPIView.resolve()` utiliza.

```python
from apps.wallet.application.use_cases import GetWalletUseCase
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.repositories import DjangoWalletRepository
from common.di.container import Container
from common.di.lifetime import Lifetime

# Exemplo de composição isolada; o WalletProvider faz isso na aplicação.
root = Container()
root.register(IWalletRepository, DjangoWalletRepository, lifetime=Lifetime.SCOPED)
root.register_self(GetWalletUseCase, lifetime=Lifetime.TRANSIENT)
scope = root.create_scope()
use_case = scope.resolve(GetWalletUseCase)
```

| Lifetime | Reutilização | Uso e limite |
| --- | --- | --- |
| `SINGLETON` | Uma instância na raiz | Estado compartilhado no processo; não guardar dados de uma requisição |
| `SCOPED` | Uma instância no container que resolve | Repositórios e dependências de uma requisição/tarefa |
| `TRANSIENT` | Nova instância por resolução | Casos de uso e serviços sem estado compartilhado |

O container injeta parâmetros obrigatórios por type hints e deixa parâmetros com default para o construtor. Classes concretas também precisam de registro. Uma factory pode receber dependências anotadas; uma `instance` explícita força singleton.

`UnregisteredServiceError` indica registro ausente, `MissingAnnotationError` identifica anotação inutilizável e `CircularDependencyError.chain` mostra ciclos detectados entre construtores. Configure o provider antes de resolver serviços. Evite reconfigurar registros depois de popular caches ou injetar um serviço scoped em um singleton. O container não descarta automaticamente conexões ou outros recursos.

## Contratos de aplicação e transações

`architecture/base.py` define `UseCase`, `Entity`, `ValueObject`, `Repository` e `UnitOfWork`. Os apps podem ter portas próprias sem herdar de `Repository`; respeite a assinatura real da interface.

Para compor escritas no banco do painel, receba `UnitOfWork` no construtor e use `with self._unit_of_work:`. O provider compartilhado injeta `DjangoUnitOfWork`.

| Operação no adaptador Django | Efeito |
| --- | --- |
| Entrar no `with` | Abre `transaction.atomic()` |
| Sair sem exceção | Confirma o bloco, respeitando eventual transação externa |
| Sair com exceção | Reverte o bloco pelo Django |
| `commit()` | Não faz nada; a saída do bloco controla a confirmação |
| `rollback()` | Marca a transação ativa para reversão |

Não aninhe blocos reutilizando a mesma instância de `DjangoUnitOfWork`: ela guarda apenas um contexto atomic. A unidade de trabalho não coordena SQLAlchemy, outro banco ou chamadas HTTP. Consulte os protocolos de cada integração para compensação e retomada.

## Modelos e UUIDs

Herde de `BaseModel` para recursos públicos: `id` é UUID v4, `seq_id` é a chave primária interna e `created_at`/`updated_at` são automáticos. Assim, `obj.pk` é sequencial. Para localizar um recurso recebido pela API, use `Model.objects.get(id=uuid_publico)`.

`InternalModel` fornece datas para dados internos sem adicionar o contrato de UUID público. `UUIDPublicFieldsMixin`, colocado antes da base do serializer na herança, remove `seq_id` e `_seq_id` e converte UUIDs no primeiro nível da representação. Objetos aninhados precisam de seus próprios serializers. `UUIDLookupMixin` configura views genéricas para buscar pelo UUID em `id`; por padrão, o parâmetro da URL se chama `pk`.

## Views, permissões e paginação

- `InjectedAPIView` fornece `resolve(Tipo)` usando o container do request; `InjectedViewSet` combina esse comportamento com `GenericViewSet`.
- `IsStaffMember` aceita usuário autenticado com `is_staff` ou `is_staff_member`; `IsSuperAdmin` exige `is_superuser`. Nenhuma dessas classes verifica propriedade de um objeto.
- `StandardPagination` usa 20 resultados por padrão, aceita `page_size` até 50 e devolve `count`, `total_pages`, `next`, `previous` e `results`.

Uma APIView não pagina automaticamente só por instanciar o paginador. Chame `paginate_queryset(queryset, request, view=self)` e depois `get_paginated_response(dados_serializados)`. Views genéricas podem declarar `pagination_class = StandardPagination`.

## Erros e correlação

Na aplicação, lance `DomainError` ou uma subclasse; na apresentação, `PdlAPIException` permite customizar o contrato DRF. Defina um código estável e uma mensagem pública:

```python
from common.architecture.exceptions import ValidationDomainError

class InvalidDestinationError(ValidationDomainError):
    """Indica um destino incompatível com a operação solicitada."""

    error_code = "INVALID_DESTINATION"
    message = "Escolha um destino válido."
```

`custom_exception_handler` converte a exceção; `ApiErrorContractMiddleware` cobre também respostas de erro externas ao DRF nas rotas `/api/`. Ambos usam `build_error_payload`, que produz `error_code`, `message`, `details`, `request_id` quando disponível e o alias legado `error`. O status HTTP permanece na resposta, não dentro desse envelope.

`RequestIdMiddleware` aceita um X-Request-ID válido ou gera outro, o disponibiliza em `request.request_id` e o devolve no header. Mensagens e detalhes das exceções previstas podem chegar ao cliente; não inclua credenciais ou diagnósticos internos nesses campos.

## Admin, autenticação e documentação HTTP

| Componente | Como reutilizar |
| --- | --- |
| `PDLModelAdmin` | Herde para aplicar o sistema de formulários aos modelos do admin |
| `PDLTabularInline` / `PDLStackedInline` | Herde e defina `model` para editar relações com os mesmos widgets |
| `PDLAdminModelForm` / `PDLForm` | Use em formulários com modelo / sem modelo |
| `PDLAdminFormMixin` | Coloque antes da base de formulário para aplicar máscaras, classes e acessibilidade |
| `PDLMoneyWidget` | Exibe decimais em pt-BR; a normalização de entrada fica no mixin/formulário |
| `CookieJWTAuthMiddleware` | Envolva a aplicação ASGI para preencher `scope['user']`; o consumer ainda controla acesso |
| `PdlSpectacularAPIView` | Exponha o schema OpenAPI nas URLs de documentação |
| `PdlSpectacularSwaggerView` / `PdlSpectacularRedocView` | Configure `url_name` para exibir o schema com os templates do painel |

`validate_ascii_username` valida comprimento e `str.isalnum()`. Seu nome é histórico: ele também aceita caracteres alfanuméricos Unicode. Não o reutilize supondo uma restrição exclusiva a ASCII.

Veja [o guia dos apps](apps.md) para exemplos completos de chamada e [a arquitetura](visao-geral.md) para o fluxo entre camadas.
