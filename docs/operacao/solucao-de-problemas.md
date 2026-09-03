# Solução de problemas

[Índice](../README.md) · [Ambiente local](../desenvolvimento/ambiente-local.md) · [Configuração](../configuracao/ambiente.md)

Comece identificando ambiente, URL, revisão e operação que falhou. Registre horário, status HTTP, `error_code` e `X-Request-ID` quando disponíveis. Não compartilhe `.env`, cookies, tokens ou payloads privados em logs públicos.

## Diagnóstico por sintoma

| Sintoma | Verificação inicial | Próximo passo |
| --- | --- | --- |
| Frontend sem conexão | Backend e destino do proxy Vite | Consulte health e `PDL_API_TARGET` |
| Host `redis` desconhecido no modo nativo | `.env` voltado ao Compose | Use host acessível pelo processo local |
| Erro de CSRF/cookie | Hostname, origens e HTTPS | Confira token CSRF e cookies da mesma sessão |
| Container em reinício | Logs do serviço e dependências | Confira banco, migrações e configuração |
| Endpoint retorna `RESOURCE_DISABLED` | Ativação do módulo | Consulte a administração de recursos |
| Item desconhecido ou ícone padrão | Catálogo e URL resolvida pela API | Confira XML, custom, cache e assets |
| Câmbio pendente | Estado do recibo e disponibilidade do jogo | Retome a mesma operação; não duplique a chave |
| Vitest não encontra testes | Diretório e padrão de descoberta | Consulte [Testes](../desenvolvimento/testes.md) |
| Tema não carrega ou fica sem imagens | Endpoint ativo, `/media/themes/` e manifesto | Confira proxy, volume e caminhos do pacote |

## Backend e proxy

Na raiz, para o Compose de desenvolvimento:

```bash
docker compose ps
docker compose logs --tail=100 backend asgi
```

Na produção, use o Compose correspondente:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web backend
```

Confira `/api/v1/system/health/` no endereço utilizado pelo cliente. Em desenvolvimento nativo, o backend costuma estar em `http://127.0.0.1:8000`; no Compose, o acesso pelo Nginx é `http://localhost`. Uma resposta de health não comprova todas as integrações externas. Um `502` pode vir do proxy sem passar pelo contrato de erros do Django; examine o upstream e seus logs.

## Redis e execução nativa

`redis` é um hostname interno do Compose. Para Celery nativo com Redis na mesma máquina, use `REDIS_URL=redis://127.0.0.1:6379/0`. Cache e Channels em development usam memória; não presuma que isso também disponibiliza um Redis para processos externos.

## Sessão, cookies e CSRF

Use o mesmo hostname durante todo o fluxo: alternar `localhost` e `127.0.0.1` cria origens e cookies diferentes. Obtenha CSRF antes de uma escrita, envie credenciais e `X-CSRFToken` e confira CORS/CSRF nas configurações.

Em produção, confirme HTTPS e `X-Forwarded-Proto` no proxy. Cookies seguros não devem ser corrigidos desativando sua proteção em produção. Passkeys também dependem do RP ID e das origens configuradas. Veja [API](../api/README.md) e [Implantação](implantacao.md).

## Itens e imagens

Confira o item em `/api/v1/public/items/catalog/` e abra a `icon_url` retornada. Alterações em XML exigem recarregar os processos do backend; customs ativos são consultados pelo catálogo composto. Novos JPGs estáticos precisam entrar no pacote de assets. Não corrija nomes ou ícones criando outro catálogo no frontend.

Veja [Catálogo de itens](../integracoes/catalogo-de-itens.md) e [Ícones](../integracoes/icones.md).

## Temas

Consulte `/api/v1/public/theme/` e abra diretamente `stylesheet_url` e um asset retornado.
Se a API responder Valorem, mas o arquivo retornar 404, confira o volume `media_files`, o proxy
de `/media/` e a existência de `MEDIA_ROOT/themes/<storage_path>`. Em erro de permissão no upload,
verifique se o processo Django escreve em `MEDIA_ROOT/themes`; o entrypoint do container cria e
ajusta `/app/media/themes`, enquanto a execução nativa cria os diretórios pais no instalador.

Um ZIP rejeitado deve ser corrigido na origem. Não remova as validações de extensão, caminho,
CSS ou tamanho. IDs e versões não podem se repetir; um pacote ativo só pode ser removido depois
da ativação de outra versão ou do default. Veja [Temas instaláveis](../funcionalidades/temas.md).

## Jogo e pagamentos

Para desenvolver sem MySQL, use `LINEAGE_DB_ENABLED=false`. Para uma integração real, confirme o dialeto e o schema antes de escritas. Falhas de prontidão do câmbio podem indicar ausência de recibos ou tabelas sem InnoDB; siga [a preparação específica](../integracoes/cambio-painel-jogo.md).

Uma queda de conexão pode ocorrer depois de o jogo ou o provedor confirmar uma operação. Não altere status nem estorne manualmente antes da conciliação. Em webhooks, confira URL pública, segredo, headers e assinatura; não desative a validação para fazer um teste passar.

## O que incluir em um relato reproduzível

Descreva o comportamento esperado e observado, os passos mínimos, ambiente, revisão, resposta de erro e testes executados. Use dados fictícios. Problemas de segurança devem seguir a [política de relato privado](../projeto/seguranca.md).
