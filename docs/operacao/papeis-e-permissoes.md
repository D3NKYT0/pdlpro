# Papéis e permissões

[← Índice](../README.md) · [Segurança](seguranca.md) · [Interface Django/Jazzmin](../desenvolvimento/interface-admin.md)

> **Atualizado:** 4 de outubro de 2026

## Contrato de menor privilégio

O acesso depende de autenticação, conta ativa, capacidade da operação e escopo dos
registros. Uma operação não declarada é negada. Ocultar um botão não autoriza nem
protege uma API: o backend toma a decisão mesmo em requisições diretas.

`is_staff` permite entrar no Django Admin/Jazzmin. Não concede capacidades na SPA,
CRUD de modelos, exceção de lançamento nem acesso financeiro. `is_superuser` é a
conta de manutenção com privilégios globais; não deve ser usado como sinônimo do
papel Administrador. MFA do admin e prova de sessão permanecem obrigatórios quando
a conta tem 2FA habilitado.

## Papéis disponíveis

- **Jogador (`player`):** funcionalidades pessoais já autorizadas pelos casos de uso.
- **Apoiador (`supporter`):** cadastro e programa de apoiadores existente, sem acesso staff.
- **Divulgador (`promoter`):** identificação de divulgação, sem capacidades administrativas.
- **Parceiro (`partner`):** identificação de parceria, sem capacidades administrativas.
- **Suporte (`support`):** consultar e atender chamados; consultar contas de jogo.
- **Moderador (`moderator`):** consultar personagens para moderação e executar ações de moderação.
- **Editor (`editor`):** consultar e editar conteúdo editorial, incluindo roadmap.
- **Equipe (`staff`):** atendimento e consulta de relatórios operacionais. É um template
  de compatibilidade mais restrito, não um atalho para administração global.
- **Administrador (`admin`):** capacidades administrativas do catálogo, sem se tornar
  superusuário e sem acesso automático ao Django Admin.

Divulgador e Parceiro não criam automaticamente campanhas, contratos ou comissões.
As funcionalidades pessoais existentes mantêm suas regras de cadastro, aprovação e
propriedade. Novas funções de parceria/divulgação precisam de casos de uso e testes
próprios; o nome do papel não permite consultar dados de outros participantes.

O campo `role` conserva o papel principal e a compatibilidade com o programa de
apoiadores. Grupos reservados `PDL:<slug>` acrescentam papéis: por exemplo,
`role=player` + `PDL:promoter` + `PDL:partner`. As permissões são a união das
concessões, sem hierarquia entre papéis. Remover um grupo não remove o papel
principal nem outra concessão que ainda autorize a mesma ação.

## Capacidades e concessões explícitas

O catálogo fica em [access.py](../../backend/apps/accounts/domain/access.py).
Cada área tem `view` para consultar e `manage` para modificar:

- Atendimento: `support`, `moderation`, `accounts`.
- Produto: `content`, `games`, `commerce`, `programs`, `resources`.
- Operação: `settings`, `notifications`, `items`.
- Consulta: `operational_reports`, `financial_reports`, `audit`, `metrics`, `docs`.
- Configuração econômica e confirmação de pagamentos simulados: `finance`.

Uma capacidade como `content.manage` corresponde à permissão Django
`accounts.content_manage`. Os registros aparecem no seletor de permissões de
Usuários/Grupos. Conceder `view` não concede `manage`; quando uma pessoa precisa de
ambas, atribua ambas. Os templates já incluem as consultas necessárias.

Somente o superadministrador pode atribuir papéis, entrada no admin, grupos e
permissões específicas. Os grupos `PDL:<slug>` têm grants definidos em código,
mostrados em **Permissões do papel** no Jazzmin. O seletor **Permissões** acrescenta
exceções, não remove grants do template. Para reduzir um template, remova o grupo
ou altere o papel principal, depois atribua apenas as concessões necessárias em
um grupo comum. Não renomeie um grupo reservado para simular revogação silenciosa.

Permissões nativas como `content.change_news` autorizam operações do Django Admin;
capacidades `accounts.content_manage` autorizam APIs. Templates editoriais incluem
as duas. Grants isolados precisam ser configurados para a superfície desejada.

Pacotes de tema, integrações/credenciais, rotação de segredos e representação de
usuários continuam exclusivos de superadministradores. O papel Administrador não
contorna essa exigência. Observação/catálogo de itens também preservam as
permissões nativas adicionais já exigidas por cada operação.

## Configurar pelo Jazzmin

1. Entre como superadministrador e abra **Contas → Usuários**.
2. Escolha o papel principal. Em **Grupos**, acrescente os papéis `PDL:<slug>` necessários.
3. Marque **Acesso administrativo** somente se essa pessoa precisa entrar no Django Admin.
4. Para uma exceção restrita, use um grupo comum com permissões explícitas, ou
   **Permissões específicas**. Não marque **Superadministrador** para resolver uma falta de acesso.
5. Salve e confira a API e o admin com a conta delegada. Verifique também uma URL
   proibida, não apenas a visibilidade dos menus.

Exemplo: Editor com acesso ao Jazzmin recebe `editor` e `is_staff=True`. Pode editar
notícias, FAQ, downloads, wiki, calendário, banners e roadmap. Não administra
usuários, grupos, carteira ou integrações.

Exemplo: Parceiro que precisa consultar seu cadastro no Jazzmin recebe `partner`,
`is_staff=True` e `programs.view_supporter`. A listagem fica limitada ao cadastro
do próprio usuário. Não pode aprovar seu cadastro, editar comissão ou consultar
outros parceiros, mesmo com URL direta. Na SPA, continua sem acesso ao hub staff.

Exemplo: um auditor de finanças pode receber `accounts.financial_reports_view`.
Isso libera relatórios na API/SPA sem configuração financeira. Consultar modelos
no Jazzmin exige os respectivos grants nativos e `is_staff=True`.

## Proteções do Django Admin

O Jazzmin usa as mesmas permissões do Django; o tema não é uma fronteira de segurança.

- Usuários: criação, alteração e exclusão somente por superadministradores.
  Uma concessão acidental de `change_user` não permite autopromoção, troca de senha,
  remoção de 2FA, alteração de fichas ou edição de permissões.
- Grupos: consulta e CRUD somente por superadministradores, incluindo exclusão em
  massa e alteração de permissões M2M. Isso também protege os grupos reservados.
- Escrita ORM delegada: apenas os modelos editoriais auditados. Contas, carteiras,
  pagamentos, comissões, jogo e chamados usam os casos de uso da SPA para alterações;
  grants nativos de escrita não permitem contornar essa regra pelo admin.
- Inlines: escrita somente pelo superadministrador; propriedade também vale na consulta.
- Consultas pessoais: os caminhos de propriedade auditados limitam as listagens,
  detalhes e seletores aos registros do usuário. Notas internas de chamados ficam
  ocultas. Modelos sem política auditada retornam uma consulta vazia para contas
  que não têm a capacidade correspondente do app dono.
- Consulta global: exige o grant nativo do modelo e a capacidade administrativa do
  app dono; ter uma capacidade de outro assunto não amplia o escopo.
- Alterações feitas no admin usam o histórico nativo `admin.LogEntry`. Operações
  staff na API preservam a auditoria existente. A migração não promove contas.

O superadministrador permanece uma exceção operacional consciente. As restrições
somente leitura já existentes em modelos como pagamentos e auditoria continuam
valendo também para ele.

## SPA, API e revogação

A sessão retorna `roles` e `capabilities`. `role`, `is_staff` e `is_staff_member`
continuam disponíveis por compatibilidade, mas os menus e guards da SPA usam as
capacidades efetivas. O perfil mostra os papéis em PT/EN/ES.

Cada view declara `required_capabilities` por método HTTP. `HEAD` exige a capacidade
de `GET`; `OPTIONS` exige pelo menos uma operação autorizada. Método sem declaração
com handler existente é negado; operação inexistente mantém HTTP 405 para um
usuário autorizado a consultar a view. O catálogo não substitui a autorização por propriedade nos casos de uso.

Na SPA, configuradores que oferecem edição exigem `manage`; páginas de consulta
exigem `view`. Uma concessão isolada de consulta continua utilizável na API, mesmo
quando ainda não existe uma tela de configuração somente leitura. Consultar conta
de jogo não libera o botão de desvínculo. Relatórios operacionais e financeiros
ficam separados nos menus e nas rotas.

Rotas staff de extensões sem contrato próprio de capacidade ficam restritas a
superadministradores. Ao acrescentar uma operação de extensão, implemente e teste
sua autorização específica; disponibilidade em `SystemResource` não é permissão.

Permissões são lidas do usuário autenticado, não de um grant embutido no JWT.
A revogação vale na próxima requisição com a identidade recarregada. Dentro de uma
mesma instância ORM, o Django mantém seu cache de permissões. Para conferir depois
de editar grants em código, recarregue o usuário. A SPA atualiza a sessão em seu
fluxo de refresh; uma tela aberta pode mostrar um menu antigo, mas a API já nega a
operação revogada. Não há revogação retroativa de uma operação já em andamento.

## Atualização de instalações existentes

Execute o fluxo normal de atualização e as migrações Django:

```bash
python manage.py migrate
```

As migrações acrescentam os novos nomes, registram as capacidades e criam os grupos
reservados que ainda não existem. Preservam usuários, grupos, grants e vínculos;
não convertem `is_staff=True` em Administrador. A reversão da migração de grupos
preserva os grupos para não apagar associações reais.

Depois da atualização, revise contas que dependiam de `is_staff` ou do papel Equipe
para todas as APIs. Atribua o papel específico ou um grupo de permissões restritas.
Essa redução é intencional. Sessões Django que usavam o backend nativo anterior
precisam de novo login após a troca para `RolePermissionBackend`; JWTs continuam
com as permissões consultadas no servidor. Antes de trocar um papel elevado por outro, confira
também grupos e permissões individuais: retirar apenas uma origem pode deixar
outra concessão ativa.

## Desenvolvimento e testes

O domínio contém o catálogo puro. `RolePermissionBackend` integra seus templates
ao contrato `has_perm` do Django, preservando autenticação e grants nativos.
`HasCapability` verifica os métodos na apresentação; casos de uso continuam
responsáveis pelos registros e invariantes. O provider/DI dos apps permanece no
fluxo das operações; não se resolve infraestrutura dentro da aplicação.

Ao criar um modelo de admin, herde `PDLModelAdmin` e declare uma política de escopo
auditada quando necessário. Inlines usam `PDLTabularInline`/`PDLStackedInline`.
Acrescentar um modelo à lista de escrita editorial exige revisar seus efeitos
colaterais e testar a delegação. Não use `is_staff` como autorização de negócio.

As regressões em [test_access_control.py](../../backend/apps/accounts/tests/test_access_control.py)
cobrem templates, combinação/revogação, leitura sem escrita, conta inativa, métodos
não declarados, entrada sem grants, POST de autopromoção, grupos e ações em massa,
edição editorial e propriedade de parceiros. Os testes de rota, hub e HTTP da SPA
cobrem o contrato de capacidades e a navegação autorizada. Consulte os comandos
obrigatórios em [Testes e qualidade](../desenvolvimento/testes.md).
