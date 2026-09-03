# Como usar e estender os apps

[← Índice da documentação](../README.md)

Cada app reúne uma capacidade do painel. As docstrings das classes explicam sua responsabilidade, a entrada esperada e os efeitos relevantes. Comece pelo caso de uso da operação e siga as portas até os adaptadores quando precisar entender a persistência ou uma integração.

## Onde procurar

| App | Responsabilidade | Pontos de entrada para desenvolvimento |
| --- | --- | --- |
| `accounts` | Cadastro, sessão, e-mail, 2FA, passkeys e progresso | `application/use_cases.py`, `application/twofa.py`, `presentation/views/auth.py` |
| `server` | Contas Lineage, personagens, serviços e catálogos | `domain/gateways.py`, `application/account_use_cases.py`, `infrastructure/provider.py` |
| `wallet` | Carteira, transferências, bônus e câmbio com o jogo | `application/use_cases.py`, `application/exchange.py`, `domain/repositories.py` |
| `payment` | Pedidos, gateways, confirmação e webhooks | `application/use_cases.py`, `application/webhooks.py`, `infrastructure/registry.py` |
| `shop` | Produtos, pacotes, carrinho, promoções e checkout | `application/use_cases.py`, `application/commerce.py` |
| `inventory` | Inventários do painel e movimentação de itens | `application/use_cases.py`, `domain/repositories.py` |
| `marketplace` | Custódia, anúncios e venda de personagens | `application/use_cases.py` |
| `auction` | Leilões, lances e entrega de itens | `application/use_cases.py`, `tasks.py` |
| `games` | Roleta, caixas, pesca, economia e passe | `application/*_use_cases.py`, `infrastructure/models.py` |
| `content` | Notícias, wiki, FAQ, downloads e documentos legais | `application/use_cases.py`, `application/legal.py` |
| `communication` | Notificações persistidas e Web Push | `application/notify.py`, `application/push_use_cases.py` |
| `staff` | Configuração, relatórios e ferramentas administrativas | `application/use_cases.py`, `application/financial_reports.py`, `presentation/views/` |
| `programs` | Apoiadores, comissões, roadmap e ativação de recursos | `models.py`, `services.py`, `views.py`, `middleware.py` |
| `support` | Chamados, respostas e atribuição de atendimento | `models.py`, `presentation/views/customer.py`, `presentation/views/staff.py` |
| `themes` | Instalação, validação, ativação e publicação de temas globais | `application/theme_packages.py`, `infrastructure/models.py`, `presentation/views.py` |

## Responsabilidade das classes

| Tipo | Para que serve | Como usar |
| --- | --- | --- |
| Entidade/DTO | Transporta dados sem expor o ORM | Leia os campos tipados; não espere métodos como `save()` |
| `*Input` / `*Actor` | Identifica a operação e seu autor | Construa depois da validação; derive a identidade da sessão |
| `*UseCase` | Executa uma operação da aplicação | Resolva pelo container e chame `execute` com a assinatura declarada |
| `I*Repository`, `I*Gateway`, outras portas | Define o contrato de persistência ou integração | Injete a interface no construtor; implemente ou substitua o adaptador |
| Adaptador Django/SQLAlchemy | Traduz a porta para banco ou serviço externo | Registre no provider; confira limites transacionais antes de compor escritas |
| `*Provider` | Associa tipos e define seus lifetimes | Acrescente registros em `register`; o `AppConfig.ready()` inclui o provider |
| Serializer | Valida entrada ou representa saída HTTP | Use `is_valid()` antes de `validated_data`; use `.data` para resposta |
| View | Trata o transporte e suas permissões | Registre nas URLs e delegue operações aos serviços da aplicação |
| Modelo/admin | Define persistência e edição administrativa | Use UUID público nas APIs e configure o admin nas classes dedicadas |

Essa é a direção da arquitetura, mas a organização atual tem variações. `programs` mantém modelos, serializers e views na raiz; `support` mantém parte das regras nos handlers; alguns serviços de `games`, `shop` e `staff` acessam o ORM diretamente. Leia a implementação antes de presumir que toda classe depende apenas de interfaces. Não crie uma porta fictícia para usar uma operação existente.

## Exemplo: chamar um caso de uso de uma view

O fluxo abaixo usa classes existentes. O UUID do remetente vem do usuário autenticado, e não de um campo livre no payload.

```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wallet.application.use_cases import (
    TransferToPlayerInput,
    TransferToPlayerUseCase,
)
from apps.wallet.presentation.serializers import TransferSerializer, WalletSerializer
from common.views import InjectedAPIView

class TransferExampleView(InjectedAPIView):
    """Valida uma transferência e devolve a carteira atualizada do remetente."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entrada = TransferToPlayerInput(
            sender_id=request.user.id,
            **serializer.validated_data,
        )
        carteira = self.resolve(TransferToPlayerUseCase).execute(entrada)
        return Response(WalletSerializer(carteira).data)
```

O `DependencyInjectionMiddleware` precisa estar ativo. O `WalletProvider` já registra esse caso de uso, `IWalletRepository` e a política de bônus; `CommonProvider` registra `UnitOfWork`. Não crie outro container global dentro da view.

Para uma tarefa ou comando com Django já inicializado, abra um escopo para aquela execução:

```python
from apps.wallet.application.use_cases import GetWalletInput, GetWalletUseCase
from common.di.bootstrap import DependencyInjection

def consultar_carteira(user_id):
    """Consulta a carteira de um usuário autorizado pelo chamador."""
    scope = DependencyInjection.root().create_scope()
    return scope.resolve(GetWalletUseCase).execute(GetWalletInput(user_id=user_id))
```

`GetWalletUseCase` pode criar a carteira se ela não existir. O container não autentica o autor de um comando nem decide se ele tem acesso ao UUID recebido. Em testes unitários, também é possível instanciar o caso de uso passando um fake que implemente a porta, sem iniciar o Django quando a implementação não depende dele.

## Cuidados que fazem parte do contrato

- **Valores:** saldo da carteira e bônus são quantidades de moedas; `amount` e `currency` de um pagamento representam dinheiro. `CoinQuote` separa os dois. Use `Decimal`, por exemplo `Decimal("10.00")`, para preservar a precisão.
- **Identificadores:** `BaseModel.id` é UUID público, enquanto `pk` é `seq_id`. Já `char_id` e IDs de tipos de itens do Lineage são inteiros. O nome `item_id` pode representar um UUID de produto ou um inteiro do jogo conforme a entrada; confira a anotação.
- **Autorização:** dataclasses e resolução de dependências não validam acesso. A view controla a sessão e a permissão inicial; operações sobre contas e recursos devem aplicar as verificações previstas na aplicação.
- **Transações:** `DjangoUnitOfWork` abrange o banco Django. Uma chamada SQLAlchemy ao Lineage ou HTTP ao provedor tem efeitos independentes. Um erro posterior no painel não implica reversão dessas chamadas.
- **Câmbio:** em `ExchangeCoinsUseCase`, reutilize `request_key` e os mesmos parâmetros para retomar uma operação `pending`. O recibo no banco do jogo permite reconhecer uma aplicação anterior. Não trate timeout como rejeição definitiva.
- **Pagamento:** `SettlePaymentUseCase` efetua crédito e deve receber confirmação confiável. `ApplyGatewayPaymentUseCase` não valida assinatura. `GetPaymentStatusUseCase` também pode liquidar um pedido; o nome de consulta não significa ausência de escrita.
- **Administração:** os casos de uso de `staff` pressupõem a autorização feita pela apresentação. Ao reutilizá-los fora de HTTP, aplique controle equivalente no chamador.
- **Temas:** apenas superadministradores instalam, ativam ou removem pacotes. O app `themes`
  valida o ZIP e publica arquivos em `MEDIA_ROOT`; o frontend executa somente renderers React
  homologados. Não extraia o pacote diretamente nem aceite HTML ou JavaScript arbitrário.

## Ao adicionar uma operação

1. Localize o app responsável e veja como a operação semelhante está implementada.
2. Declare entrada, retorno, regras, permissões e falhas esperadas no caso de uso.
3. Crie ou estenda portas e adaptadores quando houver uma fronteira de persistência ou integração.
4. Registre as dependências no provider com os lifetimes adequados.
5. Valide os dados no serializer, exponha a view e registre a rota.
6. Documente efeitos colaterais, unidades e condições de repetição junto às classes; use comentários para explicar decisões que o código não deixa evidentes.
7. Teste a mudança de comportamento e atualize o contrato OpenAPI quando aplicável.

Veja também [os componentes compartilhados](common.md), a [arquitetura](visao-geral.md) e o [ambiente de desenvolvimento](../desenvolvimento/ambiente-local.md).
