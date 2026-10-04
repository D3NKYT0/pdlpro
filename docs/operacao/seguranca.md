# Segurança de contas e operações

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Política de relato](../projeto/seguranca.md) · [Instalar (Release)](distribuicao.md)

> **Atualizado:** 2 de outubro de 2026

> [!IMPORTANT]
> Documento canônico de **segurança operacional**. Outros guias devem linkar
> para cá em vez de repetir checklists.

## Atualização

O backend fixa PyJWT 2.15.0, que inclui a correção de [GHSA-8wjv-2p76-3863](https://github.com/advisories/GHSA-8wjv-2p76-3863). Reconstrua a imagem ou reinstale `backend/requirements.txt` e reinicie todos os processos que validam JWT, incluindo ASGI. No ambiente distribuído, confirme `python -c "import jwt; print(jwt.__version__)"` e execute a auditoria de dependências. Atualizar apenas o arquivo de requisitos não corrige processos já instalados.

Os testes em `backend/common/tests/test_jwt_malformed_header.py` verificam rejeição sem erro 500 por cookie, Bearer e renovação, além de usuário anônimo no middleware WebSocket. Eles exercitam a aplicação em teste, sem comprovar que esse token ultrapassa os limites de cabeçalho do proxy em produção.

A versão 2.15.0 também corrige [GHSA-42vr-xj54-vc7v](https://github.com/advisories/GHSA-42vr-xj54-vc7v), que ainda afeta a 2.14.0 na leitura de payload sem verificação de assinatura. A auditoria deve confirmar a ausência dos dois alertas no ambiente instalado.

A atualização inclui a migração `server.0005_characterserviceoperation`. Execute as migrações antes de liberar tráfego e reinicie os processos Django/Celery. Publique também o frontend atualizado.

Os JWTs anteriores, sem a informação de revogação por senha, deixam de ser aceitos: usuários precisam entrar novamente. Links antigos de recuperação de senha também deixam de funcionar; solicite outro link. Não é necessário alterar o segredo global da instalação para aplicar estas proteções.

## Contas e autenticação

- A propriedade de contas Lineage vem do vínculo do gateway. Coincidência de nome e registro local não autorizam operações. Contas antigas devem ser vinculadas com a senha do jogo ou confirmação por e-mail.
- O Django Admin exige o código TOTP ou um código de recuperação quando o usuário habilitou 2FA. Sessões administrativas sem a prova do segundo fator atual precisam autenticar novamente. O layout preserva CSRF e os assets compartilhados. O segredo TOTP e os hashes dos códigos ficam cifrados em repouso (`PDL_DATA_ENCRYPTION_KEY`); cada código de recuperação vale uma vez e só aparece em claro na confirmação da ativação. Em Conta e segurança (`/panel/security`) a ativação mostra o QR do autenticador (PNG da URI `otpauth`) e a chave manual.
- Refresh tokens são rotacionados e consumidos uma única vez, com bloqueio por usuário. Logout revoga o refresh apresentado; access tokens já emitidos expiram em até 15 minutos por padrão. Redefinir a senha invalida também os access tokens imediatamente nas novas requisições, incluindo autenticação WebSocket.
- O usuário autenticado lista sessões ativas em `GET /api/v1/auth/sessions/`, revoga uma em
  `DELETE /api/v1/auth/sessions/<jti>/` e encerra as demais em
  `POST /api/v1/auth/sessions/revoke-others/`. A interface fica em Conta e segurança
  (`/panel/security`). Quem já está logado em `/register` é enviado a essa tela.
- Access e refresh não são expostos no JSON de autenticação; ficam somente nos cookies `HttpOnly`.
  O cookie de acesso dura o mesmo que o JWT (`ACCESS_TOKEN_MINUTES`); o de renovação segue
  `REFRESH_TOKEN_DAYS`. Sem o cookie de acesso, `POST /api/v1/auth/refresh/` emite outro par.
- O link de recuperação usa token vinculado à senha e validade de uma hora. O consumo e a alteração de senha são serializados: repetir o link, inclusive simultaneamente, é rejeitado.
- OAuth mantém estado descartável associado à sessão do navegador. Cookies de sessão devem acompanhar início e callback. Vincular um provedor exige o mesmo usuário autenticado e a mesma credencial de sessão.
- Um login social não assume automaticamente cadastro com e-mail ainda não verificado. O proprietário deve recuperar o acesso, verificar o e-mail e então conectar o provedor. Contas sociais com e-mail diferente não verificam o e-mail local.

## Proxies e limites

`REST_FRAMEWORK.NUM_PROXIES` usa `TRUSTED_PROXY_COUNT`: a identidade vem da direita da cadeia, descartando o prefixo que o cliente pode inventar. Produção assume dois proxies (externo HTTPS e Nginx interno); o Compose de desenvolvimento assume um. Sem proxy, configure zero. Ajuste o valor à topologia real, não ao cabeçalho recebido.

Somente os proxies confiáveis devem alcançar o backend/Nginx interno; mantenha
a restrição de rede da [Distribuição](distribuicao.md) (porta 8080 só na rede
privada). O proxy deve acrescentar o endereço real do remetente. Adicionar
proxies exige revisar a contagem. Uma contagem incorreta pode agrupar
visitantes na mesma cota ou confiar em dados enviados pelo cliente.

O DRF aplica limites globais e escopos separados para login (10/minuto) e cadastro (10/hora).
O Nginx absorve rajadas da API em 20 requisições/segundo por IP, com burst de 40; ele complementa
o limite persistido no cache da aplicação. Em produção, a chave usa o último endereço acrescentado
ao `X-Forwarded-For`; somente o proxy externo confiável deve alcançar essa porta. Schema e interfaces OpenAPI exigem staff:
`core.settings.production` define `OPENAPI_DOCS_PUBLIC=false` e ignora a variável de ambiente.
Django e Nginx emitem a CSP; a da SPA/API não inclui `script-src 'unsafe-inline'`; admin e
`/api/docs/` conservam a exceção HTML. Mantenha as listas de origens iguais.

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

Liquidação e cancelamento bloqueiam o pedido antes de ler seu estado. O bloqueio permanece até o commit do crédito e da confirmação. Respostas tardias de checkout/status não reabrem pedidos encerrados. A carteira e o pedido continuam no mesmo UnitOfWork; isso não torna chamadas a provedores ou ao jogo parte da transação Django. Depois de confirmar, falhar ou cancelar, o repositório apaga `client_secret` e códigos PIX/boleto do pedido. O log de webhook guarda só identificadores e status, sem PII nem `client_secret`.

## Validação

Consulte os [resultados locais de 4 de setembro de 2026](../historico/2026-09-04-seguranca.md), incluindo cobertura e limitações das verificações.

Regressões de segurança estão em `accounts/tests/test_security_regressions.py` e `server/tests/test_security_regressions.py`; cenários HTTP de pagamento permanecem em `payment/tests/`. Frontend cobre os contratos, os callbacks rejeitados e a interação de serviços com carregamento, vazio, falha, sucesso e envio duplicado.

Concorrência real usa um PostgreSQL **dedicado e descartável**, com settings derivados de `core.settings.test` que substituem somente `DATABASES`, preservando gateways falsos e e-mail em memória. Não aponte para produção. Execute explicitamente:

```bash
python -m pytest apps/payment/tests/concurrency_postgresql.py --ds=SEU_MODULO_DE_SETTINGS_ISOLADO
```

O teste exige PostgreSQL e falha se executado com SQLite. Sua nomenclatura separa a homologação que exige banco específico da suíte local padrão; não há skip nem dependência de serviços reais.


## Acesso administrativo como usuário

Em **Painel → Admin → Contas**, superadministradores encontram **Usuários do site**,
com busca por usuário, nome ou e-mail e páginas de vinte contas. A lista usa linhas
compactas com identificação e e-mail à esquerda, ação à direita e quebra responsiva
no celular. **Entrar como usuário**
abre o painel com as permissões reais daquela conta; contas inativas ou com papel de
equipe não podem ser representadas. As contas Lineage continuam na seção seguinte.

O botão compacto **Voltar para <administrador>** flutua no canto inferior direito e aparece nas rotas públicas e no painel,
inclusive após recarregar, e retorna à listagem administrativa. A troca reinicia os
providers e o cache da SPA para evitar dados da identidade anterior. O retorno usa
uma prova assinada em cookie HttpOnly e exige CSRF; não aceita um ID de administrador
fornecido pelo cliente. Mesmo sem cookies de acesso do jogador, o retorno continua
possível enquanto a sessão original do administrador estiver válida.

Cada troca mantém `ImpersonationSession` com autor, alvo, início, limite de uma hora e
encerramento. O acesso não recebe privilégios da equipe. Encerrar revoga imediatamente
os JWTs da representação, incluindo tokens renovados. Revogar a sessão original,
alterar a senha do administrador, remover seu privilégio ou promover o alvo à equipe
bloqueia a representação. Após uma hora, o acesso ao jogador termina, mas o botão de
retorno permanece disponível enquanto a sessão original for válida.

Na atualização, execute `python manage.py migrate` para criar a tabela de auditoria.
Os cenários HTTP estão em `backend/apps/accounts/tests/test_impersonation_api.py`;
as interações e o contrato HTTP da SPA estão em `Impersonation.test.tsx` e
`services/domain/impersonation.test.ts`.
