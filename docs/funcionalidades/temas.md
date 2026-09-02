# Temas instaláveis

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Implantação](../operacao/implantacao.md)

O PDL PRO aplica uma única identidade visual às páginas públicas, autenticação, painel do
jogador e administração React. A estrutura, a acessibilidade e o comportamento continuam no
produto; um tema fornece somente CSS e assets locais.

O tema `default` é interno, imutável e permanece em `frontend/public/theme/default`. Ele não é
gravado na tabela de pacotes, não pode ser enviado, removido ou sobrescrito e volta a ser usado
quando nenhum tema instalado está ativo. Assets omitidos por um pacote também usam o arquivo
correspondente do default.

## Instalar e ativar

Somente um superadministrador pode alterar a aparência global:

1. Abra **Painel > Administração > Temas**.
2. Selecione um ZIP PDL 2.0 de até 32 MB.
3. Instale o pacote. A instalação não o ativa automaticamente.
4. Confira nome, autor e versão e pressione **Ativar**.

Para reverter, ative **PDL Default**. Um pacote ativo não pode ser removido; primeiro ative o
default ou outra versão. A ativação é transacional e nunca deixa dois temas ativos.

O pacote Valorem de referência pode ser gerado e mantido localmente em
`frontend/theme-packages/valorem-pdl2.zip`. Essa pasta é ignorada pelo Git: pacotes, fontes e
assets comerciais são distribuídos fora do repositório e instalados pelo painel.

## Contrato do pacote

O ZIP contém seus arquivos diretamente na raiz:

```text
theme.json
theme.css
images/
  logo.png
  background.webp
fonts/
  display.woff2
```

Manifesto mínimo:

```json
{
  "schemaVersion": 1,
  "pdlVersion": 2,
  "id": "meu-tema",
  "name": "Meu Tema",
  "version": "1.0.0",
  "author": "Equipe",
  "description": "Identidade visual do servidor.",
  "entrypoint": "theme.css",
  "assets": {
    "images/logo.png": "images/logo.png",
    "images/bg/5.jpg": "images/background.webp"
  }
}
```

`assets` mapeia o nome lógico usado pelo frontend para um arquivo do pacote. O caminho deve ser
relativo e existir no ZIP. Não declare um asset para manter a versão do default.

O seletor raiz recomendado é:

```css
:root[data-pdl-theme="meu-tema"] {
  --bg: #080808;
  --bg-panel: #151515;
  --gold: #d4af61;
  --text: #f4f1e9;
  --muted: #aaa298;
  --border: rgba(212, 175, 97, .25);
}
```

Seletores de contexto disponíveis: `html.pdl-public` e `html.pdl-panel`. O identificador do
pacote também é aplicado como `data-pdl-theme` no elemento `html`.

## Segurança e limites

O instalador lê cada entrada e nunca chama a extração direta do ZIP. São bloqueados:

- caminhos absolutos, `..`, nomes duplicados e links simbólicos;
- JavaScript, HTML, SVG e extensões não permitidas;
- `@import`, URLs externas, Data URLs e referências a arquivos ausentes no CSS;
- pacotes com mais de 256 arquivos, 64 MB expandidos ou compressão suspeita;
- o identificador reservado `default` e versões fora do contrato PDL 2.0.

Os arquivos são gravados primeiro em diretório temporário e publicados por movimentação
atômica. Falhas de validação ou banco removem o estágio sem alterar o tema ativo.

## Armazenamento e publicação

Pacotes ficam em `MEDIA_ROOT/themes/<tema>/<versão-hash>/` e são entregues sob
`/media/themes/`. Em produção, o volume `media_files` já é compartilhado entre Django, workers
e Nginx. `backend/media/` também é ignorado pelo Git. Preserve o volume `media_files` em
upgrades e backups; ele é a fonte persistente dos temas instalados.

No deploy, o entrypoint cria `/app/media/themes` e corrige sua permissão antes de iniciar a
aplicação. O instalador também cria `MEDIA_ROOT/themes` com todos os diretórios pais, tornando
seguros tanto o primeiro deploy com volume vazio quanto uma execução local sem a pasta criada.

O endpoint público `GET /api/v1/public/theme/` informa o tema ativo. A administração usa
`/api/v1/staff/themes/`; não exponha essas operações sem autenticação e papel de superusuário.

## Validação

Além das suítes completas do projeto, confira:

```bash
cd backend
python -m pytest apps/themes/tests

cd ../frontend
npm run test:run -- src/theme/ThemeProvider.test.tsx src/pages/admin/AdminThemesPage.test.tsx src/services/domain/theme.service.test.ts
```

Homologue o catálogo de componentes, uma página pública, autenticação e painel em desktop e
celular. Verifique também a restauração do default depois de ativar um pacote.
