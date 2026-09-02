Ícones oficiais do Lineage 2, um JPG por item ID (`57.jpg` = Adena).

Esta pasta é gerada. Para recarregar:

    cd frontend
    npm run icons

Os JPGs individuais não são versionados. O comando também atualiza
`frontend/assets/item-icons.tar.gz`, que é versionado e extraído automaticamente
antes de `npm run dev` e `npm run build`. Assim o build de produção não publica
somente o placeholder `default.jpg`.
