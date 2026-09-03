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
- Rotacione imediatamente qualquer segredo que possa ter sido exposto.
