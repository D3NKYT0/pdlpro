# Política de segurança

[← Índice da documentação](../README.md)

## Versões suportadas

O projeto está em desenvolvimento ativo. Somente a versão mais recente da branch principal recebe correções de segurança. Releases e forks anteriores não possuem suporte garantido.

## Como reportar uma vulnerabilidade

Não abra uma issue pública e não inclua segredos, dados pessoais, tokens, dumps ou instruções de exploração em canais públicos.

Use o recurso privado **Report a vulnerability** na área de segurança do repositório GitHub. Se ele não estiver disponível, contate o mantenedor de forma privada pelo [perfil do proprietário do repositório](https://github.com/D3NKYT0) e peça um canal seguro para o relato.

Inclua, quando possível:

- componente e versão afetados;
- pré-condições e impacto observado;
- passos mínimos para reprodução;
- evidências sem dados reais de usuários;
- sugestão de mitigação, se houver;
- forma segura de contato para retorno.

O mantenedor confirmará o recebimento quando possível, avaliará severidade e alcance e combinará a divulgação após existir uma correção ou mitigação. Não há SLA público neste momento.

## Agradecimentos

Relatos responsáveis que resultaram em correção no produto:

| Relato | Relator |
| --- | --- |
| Venda dupla no marketplace sob compras concorrentes (TOCTOU no anúncio) | [Victor Mendonça (@mend3)](https://github.com/mend3) |

## Escopo prioritário

- autenticação, cookies JWT, CSRF, 2FA e recuperação de conta;
- autorização sobre contas e personagens do Lineage 2;
- carteira, pagamentos, webhooks, loja, marketplace e leilões;
- SQL configurável e acesso ao banco do jogo;
- WebSockets, amizades, mensagens e Web Push;
- upload ou exposição de arquivos de mídia;
- instalação de temas, validação de ZIP/CSS, path traversal e XSS persistente;
- vazamento de variáveis de ambiente, logs ou dados pessoais.

## Boas práticas para operadores

- Nunca publique `.env`, credenciais de banco, chaves VAPID ou segredos de webhook.
- Use `core.settings.production`, HTTPS e cookies seguros em produção.
- Restrinja hosts, origens CORS/CSRF/WebSocket e acesso de rede aos bancos.
- Desative o método de pagamento `mock` e restrinja a documentação da API quando não forem necessários.
- Aplique atualizações de dependências, faça backups testados e monitore os health checks.
- Permita instalar/ativar temas somente a superadministradores, mantenha o limite de upload
  no proxy e não contorne a validação para aceitar HTML, JavaScript ou URLs externas.
- Gere `SECRET_KEY` e `REDIS_PASSWORD` pelo configurador de produção. Produção recusa iniciar
  com chave de exemplo e o Redis do Compose exige senha.
- Mantenha `PRIVATE_MEDIA_ROOT` fora do diretório servido pelo proxy: os pacotes LGPD só devem
  sair pela view com token assinado.
- Preserve os cabeçalhos de segurança e a negação de `/media/lgpd_exports/` no Nginx, e mantenha
  o `X-Forwarded-For` confiável restrito aos proxies internos usados pelo rate limit.
- Rotacione imediatamente qualquer segredo que possa ter sido exposto.
