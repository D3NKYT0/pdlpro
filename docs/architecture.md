# Arquitetura PDL PRO

## Regra de dependência

```
presentation → application → domain
      ↓              ↓
infrastructure ─────→ domain
```

O domínio não importa Django. Infraestrutura implementa as portas (ABC). Apresentação só valida HTTP e chama use case.

## Injeção de dependência

1. Cada app registra um `AppProvider` em `AppConfig.ready()`.
2. `DependencyInjection.root()` compõe o container.
3. `DependencyInjectionMiddleware` abre um **scope** por request.
4. Controllers (`InjectedAPIView`) resolvem classes: `self.resolve(GetWalletUseCase)`.

Lifetimes: `SINGLETON` (processo), `SCOPED` (request), `TRANSIENT` (sempre novo).

## Como adicionar um caso de uso

1. Entidade / exceção em `domain/`
2. Interface `I*Repository` em `domain/repositories.py`
3. Classe `*UseCase` em `application/use_cases.py` com `__init__` tipado
4. Implementação em `infrastructure/repositories.py`
5. `Provider.register(...)` com a interface e o use case
6. View fina em `presentation/views/` + serializer + rota no namespace (`auth` / `public` / `shared` / `customer` / `system`)
7. Cliente em `frontend/src/services/domain/*.service.ts` exportado por `services/api.ts`

Nada de funções soltas para regra de negócio. Nada de SQL na view. Nada de `fetch` na página.
