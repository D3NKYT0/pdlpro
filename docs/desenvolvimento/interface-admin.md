# Interface compartilhada do backend

[Índice](../README.md) · [Componentes React](componentes.md) · [Common](../arquitetura/common.md) · [Testes](testes.md)

O Django Admin/Jazzmin, o login administrativo e a documentação HTTP compartilham os botões em [buttons.css](../../backend/static/pdl_admin/css/buttons.css). A biblioteca preserva as texturas PDL e as mesmas tonalidades de sucesso, atenção e perigo usadas no React. Cada renderer mantém sua implementação; o backend não precisa carregar React para apresentar seus formulários.

## Catálogo dentro do admin

Abra **Componentes** na barra superior ou acesse `/admin/components/`. A página exige usuário ativo da equipe, aceita somente GET e demonstra ações locais sem alterar registros. Inclui variantes, tamanhos, ícone, link indisponível e estado de envio de um `input[type="submit"]`.

O catálogo usa o [template real do admin](../../backend/templates/admin/pdl_components.html). Sua proteção vem de `admin.site.admin_view`; não remova essa proteção ao acrescentar exemplos.

## Classes disponíveis

| Finalidade | Classe Jazzmin/Bootstrap | Classe para templates próprios |
| --- | --- | --- |
| Principal, dourado | `btn btn-primary` | `pdl-button` |
| Secundário, azul | `btn btn-secondary`, `btn-default` ou `btn-info` | `pdl-button pdl-button--secondary` |
| Sucesso, verde | `btn btn-success` | `pdl-button pdl-button--success` |
| Atenção, âmbar | `btn btn-warning` | `pdl-button pdl-button--warning` |
| Perigo, vermelho | `btn btn-danger` | `pdl-button pdl-button--danger` |
| Compacto | Acrescente `btn-sm` | Acrescente `pdl-button--sm` |
| Amplo | Acrescente `btn-lg` | Acrescente `pdl-button--lg` |
| Somente ícone | Acrescente `pdl-button--icon` e `aria-label` | Mesma classe e nome acessível |

A largura acompanha texto/ícone e padding. Os tamanhos alteram altura, fonte e espaçamento; não estabelecem largura fixa ou preenchimento da linha. O adaptador também corrige a largura de 100% aplicada pelo Jazzmin à barra `#jazzy-actions`.

Os estados compartilham foco visível, hover, clique e redução de movimento. Um controle desabilitado ou pendente não recebe o efeito de hover. Para botões, use `disabled`; em links indisponíveis, use `aria-disabled="true"`, preservando o texto e um contexto que explique sua indisponibilidade. O script comum bloqueia a ativação desses links, inclusive pelo teclado.

## Criar uma tela Django

```django
{% extends "admin/base_site.html" %}
{% block content_title %}Minha ferramenta{% endblock %}
{% block content %}
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}
  <button type="submit" class="btn btn-primary" name="_save" value="1">
    Salvar configuração
  </button>
  <a class="btn btn-secondary" href="{% url 'admin:index' %}">Voltar</a>
</form>
{% endblock %}
```

O layout já carrega [pdl_ui/_button_assets.html](../../backend/templates/pdl_ui/_button_assets.html). Não copie seu CSS/JavaScript nem o template inteiro do Jazzmin. Para formulários de modelos, continue herdando `PDLModelAdmin`, `PDLTabularInline` e `PDLStackedInline`; use `PDLAdminModelForm`/`PDLForm` nas demais composições.

Templates independentes podem incluir o mesmo fragmento de assets, usando `pdl-backend` no elemento raiz. O login estende o template de registro fornecido pelo Jazzmin e acrescenta apenas os assets pelo bloco `extrahead`.

Use `type="button"` para ações que não enviam formulários. Nomes como `_save`, `_continue`, `_addanother` e `_saveasnew` fazem parte do contrato do Django e devem ser preservados.

## Envio e estado pendente

[buttons.js](../../backend/static/pdl_admin/js/buttons.js) observa envios POST nativos do admin/login para a janela atual. Reserva o formulário sincronamente para impedir submissões repetidas e anuncia o envio depois que os handlers terminam. A validação HTML continua executando antes do evento de submit.

O script não desabilita os controles de envio nem modifica `name`/`value`: isso evita perder a ação escolhida pelo usuário na requisição. Aplica `aria-busy`/`aria-disabled`, acrescenta uma mensagem acessível e restaura os atributos originais no evento `pageshow`, inclusive ao voltar pelo histórico. Campos, CSRF e máscaras continuam sob responsabilidade do formulário existente.

Formulários GET, destinos em outra janela e eventos cancelados com `preventDefault()` mantêm seu próprio fluxo. Para POST que permanece na página, como download, ou uma integração com ciclo próprio, marque `data-pdl-manual-submit` no formulário e gerencie o estado explicitamente. Exemplo para uma ação assíncrona:

```javascript
async function runAction(button, operation) {
  window.PDLButtons.setBusy(button, true, 'Salvando…');
  try {
    await operation();
  } finally {
    window.PDLButtons.setBusy(button, false);
  }
}
```

O chamador trata sucesso, falha e concorrência da operação. `setBusy` é apresentação e bloqueio da ativação do controle; não implementa idempotência no servidor, não cancela requisições e não substitui autorização/transações.

## Swagger e ReDoc

Ambos carregam os assets compartilhados. Os links da barra superior e as ações `.btn` do Swagger usam o sistema; a interface de autorização e as chamadas HTTP continuam pertencendo ao Swagger. As abas, menus, expansores e controles internos do ReDoc mantêm o contrato do SDK. O bloqueio automático de POST do admin não intercepta esses SDKs.

As classes de compatibilidade ficam em um único CSS, evitando cópias de estilos em `admin.css`, `forms.css` e `docs.css`. Para mudar uma variante, atualize a base e compare os catálogos do backend e React.

## Verificação e publicação

- [test_admin_components.py](../../backend/common/tests/test_admin_components.py): acesso ao catálogo, login, validação e destino de “Salvar e continuar”.
- [test_openapi_docs.py](../../backend/common/tests/test_openapi_docs.py): carregamento dos assets nas páginas de documentação.
- [admin-buttons.test.ts](../../frontend/src/lib/admin-buttons.test.ts): executa o JavaScript entregue pelo backend em jsdom; cobre repetição, FormData, AJAX, teclado, histórico e validação nativa. Roda com o Vitest do frontend. A cobertura percentual do frontend continua medindo `frontend/src`, não este script estático do backend.

Antes de concluir mudanças, execute as verificações completas do [guia de testes](testes.md) e confira catálogo, formulário real e documentação em desktop/celular. Na implantação, publique também os arquivos estáticos via `collectstatic`, conforme o [guia de implantação](../operacao/implantacao.md).
