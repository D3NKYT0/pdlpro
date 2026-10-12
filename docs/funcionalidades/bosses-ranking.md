# Bosses e respawn no ranking

[← Índice](../README.md)

O ranking público oferece abas de épicos e bosses normais. Em **Django Admin →
Servidor Lineage → Bosses do ranking**, o superadministrador pode cadastrar,
editar, desativar e remover metadados de NPCs, inclusive bosses customizados.

- **ID do NPC:** ID inteiro positivo usado pelo servidor de jogo, único no catálogo.
- **Nome:** nome público que substitui o fallback do ranking. Deixe vazio para
  preencher pelo ID no acervo XML; NPC fora do acervo exige nome manual.
- **Categoria:** épico ou normal; define a aba pública.
- **Origem do respawn:** tabela de épicos ou de raids, independente da categoria.
- **Ativo:** desmarque para ocultar o NPC das duas abas.

Exemplo: NPC `90001`, nome `Custom Dragon`, categoria **Épico**, origem **Tabela
de raids**. Ele aparece na aba de épicos com o timestamp retornado pela consulta
de raids e não aparece também na aba de normais.

Os catálogos Lucera v2, Dream v3 e Mobius consultam `epic_boss_spawn`
(`bossId`, `respawnDate`) e `raidboss_status` (`id`, `respawn_delay`). Forks com
schemas diferentes devem fornecer as consultas nomeadas `grandboss_status` e
`raidboss_status` no overlay da extensão, retornando `boss_id` e `respawn`.
Não é necessário criar `site_bosses` no banco Lineage.

O acervo em `backend/data/npc/*.xml` fornece os nomes e níveis dos NPCs que
aparecem no ranking, mesmo sem cadastro administrativo. Pode ser configurado
por `LINEAGE_NPC_XML_DIR`. São aceitos `<npc id="25001" name="Greyclaw Kutus">`
e nível em `<set name="level" value="23"/>` (ou `val`). A leitura não carrega o
DTD externo. Arquivos ausentes ou inválidos preservam o fallback por ID; nomes
definidos no admin têm prioridade. O índice é reutilizado entre consultas e
recarregado na próxima requisição quando os XMLs mudam.

O cadastro não cria spawns e não altera o banco do jogo. Sem linha correspondente
ou timestamp válido, a interface mostra **Respawn indisponível**. Zero ou data
passada indica disponibilidade segundo o timestamp do jogo; data futura mostra
o respawn no idioma ativo. Aceita Unix em segundos e milissegundos. NPCs não
cadastrados continuam aparecendo como antes, com nome padrão ou ID como fallback.

As consultas da aba ativa são atualizadas a cada 30 segundos. O recurso
`rankings-raidboss` controla a aba normal, subordinado a `rankings`. Alterações no
catálogo aparecem na próxima consulta; não é necessário reiniciar o backend.

Validação: `apps/server/tests/test_boss_rankings.py` cobre categoria/origem,
desativação, ausência de spawn, unicidade, limites, permissões, API pública e SQL
nos três dialetos. `WorldBossGrid.test.tsx` cobre nomes customizados, estados de
respawn e navegação entre abas.
`test_npc_catalog.py` cobre leitura do acervo, entidades XML, arquivos inválidos,
atualização do índice e preenchimento automático no admin.
