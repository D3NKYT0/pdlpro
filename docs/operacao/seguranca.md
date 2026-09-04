# Segurança de contas e operações

[Índice](../README.md) · [Testes](../desenvolvimento/testes.md) · [Implantação](implantacao.md)

## Atualização

A atualização inclui a migração `server.0005_characterserviceoperation`. Execute as migrações antes de liberar tráfego e reinicie os processos Django/Celery. Publique também o frontend atualizado.

Os JWTs anteriores, sem a informação de revogação por senha, deixam de ser aceitos: usuários precisam entrar novamente. Links antigos de recuperação de senha também deixam de funcionar; solicite outro link. Não é necessário alterar o segredo global da instalação para aplicar estas proteções.

## Contas e autenticação

- A propriedade de contas Lineage vem do vínculo do gateway. Coincidência de nome e registro local não autorizam operações. Contas antigas devem ser vinculadas com a senha do jogo ou confirmação por e-mail.
- O Django Admin exige o código TOTP quando o usuário habilitou 2FA. Sessões administrativas sem a prova do segundo fator atual precisam autenticar novamente. O layout preserva CSRF e os assets compartilhados.
- Refresh tokens são rotacionados e consumidos uma única vez, com bloqueio por usuário. Logout revoga o refresh apresentado; access tokens já emitidos expiram em até 15 minutos por padrão. Redefinir a senha invalida também os access tokens imediatamente nas novas requisições, incluindo autenticação WebSocket.
- O link de recuperação usa token vinculado à senha e validade de uma hora. O consumo e a alteração de senha são serializados: repetir o link, inclusive simultaneamente, é rejeitado.
- OAuth mantém estado descartável associado à sessão do navegador. Cookies de sessão devem acompanhar início e callback. Vincular um provedor exige o mesmo usuário autenticado e a mesma credencial de sessão.
- Um login social não assume automaticamente cadastro com e-mail ainda não verificado. O proprietário deve recuperar o acesso, verificar o e-mail e então conectar o provedor. Contas sociais com e-mail diferente não verificam o e-mail local.

## Proxies e limites

`REST_FRAMEWORK.NUM_PROXIES` usa `TRUSTED_PROXY_COUNT`: a identidade vem da direita da cadeia, descartando o prefixo que o cliente pode inventar. Produção assume dois proxies (externo HTTPS e Nginx interno); o Compose de desenvolvimento assume um. Sem proxy, configure zero. Ajuste o valor à topologia real, não ao cabeçalho recebido.

Somente os proxies confiáveis devem alcançar o backend/Nginx interno; mantenha a restrição de rede descrita na implantação. O proxy deve acrescentar o endereço real do remetente. Adicionar proxies exige revisar a contagem. Uma contagem incorreta pode agrupar visitantes na mesma cota ou confiar em dados enviados pelo cliente.

## Serviços pagos do personagem

Nickname e sexo aceitam `request_key` (UUID). O frontend conserva a chave ao repetir os mesmos parâmetros depois de um erro. Clientes de API devem fazer o mesmo. O campo é opcional para compatibilidade, mas clientes antigos não têm deduplicação por chave; o bloqueio de operações pendentes e a verificação de estado já aplicado continuam valendo.

A reserva do saldo e seu registro são confirmados no banco do painel antes de chamar o jogo. Saldo insuficiente impede a chamada. Operação concluída repetida não cobra novamente. Chave reutilizada com parâmetros diferentes é rejeitada. Um personagem com operação pendente não aceita outro serviço.

Rejeição inequívoca anterior à gravação no jogo estorna uma única vez. Timeout, queda da conexão ou falha inesperada mantêm a reserva pendente: não é possível inferir se o banco externo confirmou. Não se repete automaticamente a operação nem se estorna um resultado incerto.

A equipe consulta `CharacterServiceOperation` no admin, confere o estado e os registros do jogo e concilia pelo comando:

```bash
# Dentro de backend/, usando as configurações da instalação.
python manage.py reconcile_character_service UUID --result completed --note "Responsável e evidência da alteração no jogo"
python manage.py reconcile_character_service UUID --result rejected --note "Responsável e evidência de que a alteração NÃO ocorreu"
```

Escolha somente um resultado após conferência. `rejected` estorna; `completed` mantém a cobrança. A justificativa fica no registro. Repetir a conciliação de uma operação encerrada não muda o resultado nem gera novo estorno. Não use rejeição apenas porque a API retornou erro.

## Pagamentos

Liquidação e cancelamento bloqueiam o pedido antes de ler seu estado. O bloqueio permanece até o commit do crédito e da confirmação. Respostas tardias de checkout/status não reabrem pedidos encerrados. A carteira e o pedido continuam no mesmo UnitOfWork; isso não torna chamadas a provedores ou ao jogo parte da transação Django.

## Validação

Consulte os [resultados locais de 4 de setembro de 2026](../historico/2026-09-04-seguranca.md), incluindo cobertura e limitações das verificações.

Regressões de segurança estão em `accounts/tests/test_security_regressions.py` e `server/tests/test_security_regressions.py`; cenários HTTP de pagamento permanecem em `payment/tests/`. Frontend cobre os contratos, os callbacks rejeitados e a interação de serviços com carregamento, vazio, falha, sucesso e envio duplicado.

Concorrência real usa um PostgreSQL **dedicado e descartável**, com settings derivados de `core.settings.test` que substituem somente `DATABASES`, preservando gateways falsos e e-mail em memória. Não aponte para produção. Execute explicitamente:

```bash
python -m pytest apps/payment/tests/concurrency_postgresql.py --ds=SEU_MODULO_DE_SETTINGS_ISOLADO
```

O teste exige PostgreSQL e falha se executado com SQLite. Sua nomenclatura separa a homologação que exige banco específico da suíte local padrão; não há skip nem dependência de serviços reais.
