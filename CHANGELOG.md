# Changelog

O registro completo segue em [histórico de versões](docs/historico/changelog.md).

Última atualização: **14 de setembro de 2026** — Não publicado: notícias,
calendário e roadmap com edição e entrega PT/EN/ES; CRUD de
calendário, FAQ, wiki, downloads e avisos em `/panel/admin`; avisos
no sino da barra superior; dica do dia do Denkynho alinhada à faixa da
pergunta no mobile; Atendimento
fora do menu (acesso só pela Ajuda); tela
`/panel/progress` retirada (nível, conquistas e prêmios no Painel);
jornada de
recompensas e programa de apoiadores alinhados ao chrome de Jogos/Carteira;
endurecimento de
segurança (pacote LGPD em armazenamento privado, `SECRET_KEY` validada em
produção, Redis com senha, saneamento de imagens enviadas, senha de conta do
jogo com oito caracteres, cabeçalhos e rate limit do Nginx, webhook de pagamento
com `external_id` conferido), ilustrações próprias das conquistas no desenho do
Denkynho com estado bloqueado mais claro, e instaladores Linux/Windows das tags
(`install.sh` / `install.ps1`), imagens GHCR e ZIP `pdl-pro-X.Y.Z.zip` via
workflow de Release. Publicado: **[2.4.0]** —
minigames em `/panel/games` (Arena das Feras com dez oponentes e
encante +0 a +10, pescaria com iscas/espécies e i18n, roleta, baús e
taverna animados; saldo de fichas ao vivo); ficha L2 (paperdoll, bag/baú,
skills); marketplace e leilão de personagem com o mesmo snapshot;
confirmação mock só no admin; LGPD self-service. Anterior: **[2.3.0]** —
pacote legal/LGPD (textos reais, cookies, histórico, reaceitação);
atalhos **API**/**Painel** no Jazzmin e card API no hub admin; extensões
de cliente; i18n pt/en/es ampliado (SPA + gettext); sync de idioma
SPA↔API; proxy Nginx `/i18n/`; tema **PDL Classic**.
