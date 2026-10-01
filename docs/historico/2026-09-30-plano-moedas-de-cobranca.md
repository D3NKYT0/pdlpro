# Plano: moedas de cobrança para um servidor internacional

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Pagamentos (comportamento atual)](../integracoes/pagamentos.md) · [Economia](../funcionalidades/economia-jogador.md)

> **Atualizado:** 30 de setembro de 2026

> [!NOTE]
> Isto é **planejamento**. O painel publicado ainda cobra só em BRL e USD,
> com `price_brl`, `price_usd`, `multiplier` e `usd_multiplier`. O guia do
> fluxo que está no ar continua em [Pagamentos](../integracoes/pagamentos.md).

> [!IMPORTANT]
> PT, EN e ES mudam a interface. A moeda da cobrança é outra decisão: o admin
> liga as moedas, o jogador escolhe uma delas antes de pagar, e o banco do
> jogador converte o valor cobrado para a moeda da conta dele.

## O inconveniente

Um servidor no Brasil, com conta Stripe do Brasil, precisa vender para quem
fala português, inglês ou espanhol. Hoje a loja conhece duas moedas cravadas
no código. Um cartão brasileiro recusado em dólar reabre o pedido em real.
Um cartão europeu que aceita dólar permanece em dólar. Um cartão europeu que
recusa o dólar só tem o real como outra opção, porque euro não existe na
cotação.

Isso funciona para o par real/dólar. Não escala: cada moeda nova pede outra
coluna no pacote, outro multiplicador na `CoinConfig` e outro `if` na
cotação.

## O que a Stripe do Brasil já impõe

| Quem paga | Cobrança criada em | O que acontece |
| --- | --- | --- |
| Cartão emitido no Brasil | BRL | Passa, se o restante do pagamento estiver válido |
| Cartão emitido no Brasil | USD (ou qualquer outra) | Stripe recusa com `currency_not_supported`: cartão brasileiro só em real |
| Cartão de fora | USD | O emissor cobra esse valor em dólar. O banco converte para euro, libra ou a moeda da conta |
| Cartão de fora | BRL | O emissor cobra esse valor em real. O banco converte a partir do real, não de um preço em dólar |
| Cartão de fora | EUR | Só existe se a conta Stripe deixar criar o PaymentIntent em EUR **e** a loja tiver preço em EUR |

Dólar na fatura do jogador de fora aparece quando o pedido nasce em USD.
Cobrar só em real não faz o banco “comprar em dólar”.

A recuperação já iniciada no código local (`alternateStripeCurrency` +
`source_order_id`) continua como rede de segurança. Este plano generaliza
essa troca para a lista de moedas ligadas, em vez de deixar o par BRL/USD
fixo.

## Resultado para o operador de um servidor no Brasil

1. Real fica ligado. Mercado Pago (PIX, boleto) e cartão brasileiro usam esse preço.
2. Dólar fica ligado, com a taxa e os preços de pacote que o admin quiser.
3. O jogador de fora escolhe dólar na carteira e paga o preço em dólar. O banco dele converte.
4. O jogador no Brasil escolhe real, ou o cartão brasileiro força a reabertura em real se ele tinha escolhido outra moeda.
5. Euro, peso ou qualquer outra moeda só entra depois que o admin ligar a moeda, preencher os preços e a conta Stripe aceitar criar a cobrança nessa sigla.

A língua da tela não escolhe a moeda. Alguém em espanhol no Brasil paga em real. Alguém em inglês na Alemanha paga em euro, se euro estiver ligado; senão, em dólar.

## Regras do desenho

1. A lista de moedas de cobrança é dado do admin, não um par fixo no código.
2. Pacote tem um preço por moeda ligada. Preço de loja é comercial; não é câmbio ao vivo.
3. Valor avulso usa a taxa daquela moeda: coins por 1 unidade (`coins_per_unit`).
4. O catálogo do jogador é a interseção: moeda ligada pelo admin e aceita por algum gateway ativo.
5. Mercado Pago permanece só em BRL.
6. Stripe cobra as moedas da lista que a conta realmente apresenta. O padrão de uma conta Brasil é `BRL` e `USD`.
7. O jogador escolhe a moeda antes de pagar. A ordem do padrão é: a última escolha salva no navegador; sem isso, a moeda do país da conta, se essa moeda estiver no catálogo; sem país ou sem essa moeda ligada, a moeda de liquidação (BRL no servidor Brasil).
8. Se o emissor recusar a moeda, o mesmo pedido reabre **uma vez** em outra moeda que o mesmo gateway aceite. Cartão `BR` numa conta Brasil só reabre em BRL. Segunda recusa encerra e mostra o erro.
9. Bônus, campanha, PIX e primeira recarga continuam em **coins** do painel (`IPurchaseBonusPolicy.preview`). O valor cobrado no gateway não muda por causa do bônus.
10. `PAYMENT_BRL_METHOD_PRIORITY` continua valendo quando Mercado Pago e Stripe estão ativos ao mesmo tempo: o jogador escolhe, ou o admin fixa um método no real.

## Modelo de dados

Nova tabela `wallet_charge_currency` (nome interno; a API fala `code`):

| Campo | Papel |
| --- | --- |
| `code` | ISO 4217, único, maiúsculo (`BRL`, `USD`, `EUR`) |
| `enabled` | Ligada no catálogo |
| `coins_per_unit` | Taxa do valor avulso. 1 unidade da moeda compra esta quantidade de coins |
| `sort_order` | Ordem no seletor da carteira. BRL primeiro na instalação Brasil |
| `settlement` | No máximo uma moeda marcada. É o padrão da carteira e a única saída de cartão brasileiro na Stripe Brasil |

Nova tabela `wallet_coin_package_price`:

| Campo | Papel |
| --- | --- |
| `package` | FK para `CoinPackage` |
| `currency_code` | Moeda ligada |
| `amount` | Preço com duas casas, maior que zero |

`CoinPackage.price_brl` e `price_usd` permanecem por um release, escritos em
espelho quando a moeda correspondente existe. A cotação lê a tabela nova. O
release seguinte remove as colunas, quando não houver leitor externo.

`CoinConfig.multiplier` espelha `coins_per_unit` de BRL.
`CoinConfig.usd_multiplier` e `COINS_PER_USD` espelham o de USD. Os campos
antigos deixam de ser a fonte da cotação.

Setting nova, aba Pagamentos:

| Chave | Padrão | Efeito |
| --- | --- | --- |
| `STRIPE_PRESENTMENT_CURRENCIES` | `BRL,USD` | Moedas que esta conta Stripe aceita criar. A loja não oferece o que estiver fora desta lista |

Mercado Pago não ganha lista: o adaptador declara `["BRL"]`.

## Cotação

`CoinPricingService` deixa de testar `currency in {"BRL", "USD"}`.

- Pacote: preço da linha `wallet_coin_package_price` da moeda pedida. Sem linha, ou moeda desligada, a moeda é inválida para aquele pacote.
- Valor avulso: `coins = amount * coins_per_unit` da moeda ligada.
- Reabertura (`amount_for_coins`): `amount = coins / coins_per_unit` da moeda de destino.
- Moeda desligada, taxa menor ou igual a zero, ou pacote sem preço naquela moeda: `ValidationDomainError` com msgid em português e catálogo gettext EN/ES.

O pedido continua guardando `amount`, `currency` e `coins`. Liquidação credita `coins`. Nada soma BRL com USD.

## Catálogo e carteira

`GET /api/v1/customer/payments/catalog/` passa a incluir:

```json
{
  "currencies": [
    { "code": "BRL", "settlement": true },
    { "code": "USD", "settlement": false }
  ],
  "packages": [
    {
      "code": "starter",
      "coins": "5.00",
      "prices": { "BRL": "9.90", "USD": "1.99" }
    }
  ]
}
```

`methods[].currencies` continua sendo o que cada gateway pode cobrar, já filtrado pela prioridade de BRL e pela lista de apresentação da Stripe.

A carteira monta o seletor com `currencies` do catálogo. Some o seletor quando só existe uma. Pacote sem preço na moeda selecionada não aparece. Valor avulso usa a taxa da moeda selecionada e mostra o total naquela moeda.

O padrão da seleção, quando o jogador ainda não escolheu nesta instalação:

1. Última moeda que ele mesmo selecionou, guardada no navegador, se ainda estiver no catálogo.
2. País da conta, num mapa fixo país → moeda. Brasil cai em BRL. Estados Unidos e países sem moeda própria na lista caem em USD. Zona do euro cai em EUR. A moeda só entra se estiver ligada e algum gateway a aceitar.
3. Moeda de liquidação.

País vem de um campo da conta, preenchido no cadastro ou no perfil. O painel hoje não tem esse campo: a fase 2 inclui `country` (ISO 3166-1 alpha-2) no perfil e o mapa país → moeda no frontend. IP, VPN e `Accept-Language` ficam de fora. O país do cartão só existe depois da tentativa de pagamento e continua valendo só para a recusa, não para o seletor.

Se o mapa apontar para uma moeda desligada, desce para a próxima da ordem. Espanhol no Brasil continua em real. Inglês na Alemanha vai para euro quando EUR estiver no catálogo, e para dólar quando não estiver.

O seletor de método (Mercado Pago / Stripe) permanece o controle de hoje, só nas moedas em que os dois gateways aparecem. Em USD, com Mercado Pago limitado a BRL, só o Stripe entra.

Textos novos vão para `panel` em pt, en e es. Códigos de moeda e valores usam o formatador do projeto.

## Recusa de moeda no cartão

Função pura no cliente, no lugar do “sempre reabre em real”:

1. Só age com `decline_code === currency_not_supported`.
2. Cartão com `payment_method.card.country === BR`: a próxima moeda é a de liquidação, se ela for diferente da atual e o Stripe a oferecer. Se a cobrança já era a de liquidação, para.
3. Qualquer outro país, inclusive país ausente: a próxima moeda é a seguinte da lista que o Stripe oferece, diferente da atual.
4. Um `ref` na compra impede a segunda troca. Fechar o checkout ou iniciar outra compra zera o contador.
5. A reabertura usa o `source_order_id` que já existe: o backend recota o mesmo pacote (ou as mesmas coins) na moeda pedida e ignora `amount` enviado pelo cliente.
6. Toast nomeia o valor reaberto. Cartão BR usa a frase de “cartão do Brasil só em reais” quando a liquidação é BRL. Os demais usam a frase genérica de moeda recusada.

O aviso fixo no checkout deixa de falar só de cartão brasileiro em dólar. O texto passa a dizer que, se o emissor recusar a moeda, o mesmo pedido reabre uma vez em outra moeda ligada.

## Admin

Na aba Pagamentos, abaixo dos gateways:

- Lista das moedas: código, ligada, taxa, ordem, liquidação.
- Campo `STRIPE_PRESENTMENT_CURRENCIES`.
- Moeda de liquidação não pode ser desligada enquanto for a única que o Mercado Pago ou o cartão brasileiro conseguem usar. Na instalação Brasil isso trava o BRL ligado.

Em `/panel/admin/coin-packages`, um campo de preço por moeda ligada. Moeda desligada não pede preço. Pacote ativo sem preço numa moeda ligada continua válido: ele só não aparece quando o jogador seleciona essa moeda.

Salvar moeda, taxa ou preço invalida o catálogo da carteira.

## Migração

1. Criar as duas tabelas.
2. Inserir BRL (`coins_per_unit` = `multiplier` ativo, ou `1.00`) com `settlement=true`, e USD (`coins_per_unit` = `usd_multiplier` ou `COINS_PER_USD`) com `settlement=false`. As duas nascem ligadas, para a carteira atual não perder o dólar.
3. Copiar `price_brl` e `price_usd` de cada pacote para `wallet_coin_package_price`.
4. Passar `CoinPricingService` e o catálogo a ler as tabelas.
5. Manter a escrita espelho nas colunas antigas neste release.

Instalação que já tem pacotes não perde preço. Instalação nova semeia BRL e USD do mesmo jeito.

## Fases

### Fase 1 — mesma loja, fonte nova

BRL e USD continuam sendo as únicas moedas. A cotação, o catálogo e a reabertura leem as tabelas. O jogador não vê diferença além do texto do aviso, que deixa de prometer só o caso brasileiro.

Critério: os testes atuais de pacote BRL, pacote USD, valor avulso e reabertura USD→BRL passam contra a tabela, com as colunas antigas ainda preenchidas.

### Fase 2 — admin edita a lista

O admin altera taxa, liga ou desliga USD, edita o preço por moeda e ajusta as moedas de apresentação da Stripe. Desligar USD tira o dólar da carteira e do Stripe. Desligar BRL é recusado enquanto BRL for liquidação.

### Fase 3 — terceira moeda, sob confirmação

EUR (ou outra) só depois de um pagamento de teste na conta Stripe real criar um PaymentIntent nessa moeda com cartão estrangeiro de teste. O produto não liga EUR sozinho. Sem essa confirmação, a moeda fica cadastrável no admin e fora de `STRIPE_PRESENTMENT_CURRENCIES`, então não aparece na carteira.

## Fora deste plano

- Câmbio automático por API externa.
- Cobrança em euro sem preço e sem a Stripe aceitar EUR.
- Escolher moeda pela língua da interface, pelo `Accept-Language` ou pelo IP.
- Mercado Pago em outra moeda.
- Alterar bônus, faixas ou campanha para depender da moeda cobrada.
- Estorno, disputa ou troca de moeda depois do pedido pago.
- Nova versão publicada só por este documento. A implementação entra no changelog quando o código for lançado.

## Arquivos que a implementação mexe

| Camada | Onde |
| --- | --- |
| Modelo e migração | `backend/apps/wallet/infrastructure/models.py`, migração nova |
| Cotação | `backend/apps/payment/application/pricing.py` |
| Catálogo e pedido | `backend/apps/payment/application/use_cases.py`, serializers e view do customer |
| Gateways | `backend/apps/payment/infrastructure/registry.py` |
| Admin de integrações | `backend/apps/staff` (`SECTION_PAYMENTS`) e `AdminIntegrationsPage` |
| Pacotes | staff de coin packages, SPA em `/panel/admin/coin-packages` |
| Carteira | `WalletPage`, `WalletPurchaseCard`, `WalletCheckoutModal`, `frontend/src/lib/payments.ts` |
| Textos | `frontend/src/i18n/locales/{pt,en,es}/panel.json` e `admin.json` se o admin usar esse namespace; gettext em `backend/locale/{en,es,pt_BR}` |
| Guias, no release | [Pagamentos](../integracoes/pagamentos.md), [Ambiente](../configuracao/ambiente.md), [Integrações admin](../operacao/integracoes-admin.md), [Stripe](../tutoriais/stripe.md) |

Domínio sem Django. A lista de moedas entra por repositório. A application não importa infrastructure.

## Testes que acompanham o código

Backend, em `apps/payment/tests` e no staff de integrações:

- Pacote cobra o preço da moeda pedida, não o da outra.
- Valor avulso usa `coins_per_unit` da moeda.
- Moeda desligada e pacote sem preço naquela moeda falham.
- Reabertura por `source_order_id` recota na moeda pedida e rejeita pedido de outro usuário ou pedido que não está pendente.
- Mercado Pago não oferece moeda fora de BRL.
- Stripe oferece só a interseção entre moedas ligadas e `STRIPE_PRESENTMENT_CURRENCIES`.
- Prioridade `mercadopago` / `stripe` / `user_choice` continua igual no BRL.
- Patch do admin recusa desligar a moeda de liquidação e recusa código fora de ISO 4217.

Frontend:

- `alternateStripeCurrency`: cartão BR em USD devolve a liquidação; cartão BR já na liquidação devolve vazio; cartão DE em USD devolve a próxima moeda ligada; fundos insuficientes devolve vazio.
- Carteira mostra só as moedas do catálogo e esconde pacote sem preço na moeda selecionada.
- Sem escolha salva, país BR abre em BRL, país DE abre em EUR se EUR estiver no catálogo e em USD se não estiver, país ausente abre na liquidação. Escolha salva do jogador ganha do país.
- Uma recusa troca o pedido uma vez; a segunda mostra o erro e não cria outro pedido.
- Admin: desligar USD e salvar manda a moeda desligada; o campo de preço em USD some no pacote.

Dinheiro: repetir a liquidação não credita de novo. A suíte não chama Stripe nem Mercado Pago de verdade.

## Como conferir num servidor Brasil, depois de implementado

1. Admin com BRL (liquidação) e USD ligados, Stripe com `BRL,USD`, Mercado Pago ativo.
2. Jogador em BRL vê PIX/boleto e, se a prioridade deixar, cartão. O valor é `price` BRL.
3. Jogador muda para USD e vê só Stripe, no preço USD do mesmo pacote.
4. Cartão brasileiro em USD: o checkout reabre em real e o toast mostra o valor em BRL. Pagar de novo em real conclui.
5. Cartão de teste de fora em USD: o PaymentIntent fica em `usd`. Não reabre.
6. Desligar USD no admin: o seletor de dólar some e `POST` com `currency=USD` falha.
7. EUR fora de `STRIPE_PRESENTMENT_CURRENCIES`: não aparece na carteira, mesmo se existir uma linha de preço.

## Checklist do operador enquanto o plano não está no ar

O comportamento publicado segue [Pagamentos](../integracoes/pagamentos.md).

- Mantenha preço em real para o jogador do Brasil e para o cartão brasileiro.
- Mantenha preço em dólar para quem está fora e escolhe USD. O banco desse jogador converte o dólar.
- Não espere euro na fatura enquanto a loja não tiver preço em EUR e a Stripe não aceitar essa moeda.
- A troca automática real ↔ dólar depois da recusa do cartão é rede de segurança. A escolha certa continua sendo o seletor de moeda antes de pagar.
