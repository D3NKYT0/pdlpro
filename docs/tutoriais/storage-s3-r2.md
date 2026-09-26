# Tutorial: mídia S3 / Cloudflare R2

[← Tutoriais](README.md) · [Configurador admin](../operacao/integracoes-admin.md)

Objetivo: uploads de mídia (temas, imagens) no object storage em vez do disco
local. Aba **S3 / R2**.

Arquivos **privados LGPD** (`PRIVATE_MEDIA_ROOT`) continuam no filesystem
mesmo com `USE_S3=true`.

## Cloudflare R2

1. Cloudflare → R2 → Create bucket.
2. Gerencie API Tokens → Create (leitura/escrita no bucket).
3. Anote Account ID, Access Key ID e Secret.
4. Endpoint:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

5. (Opcional) Domínio público / CDN do bucket → `AWS_S3_CUSTOM_DOMAIN`.

## No PDL

| Campo | R2 típico |
| --- | --- |
| `USE_S3` | ligado |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | token R2 |
| `AWS_STORAGE_BUCKET_NAME` | nome do bucket |
| `AWS_S3_REGION_NAME` | `auto` |
| `AWS_S3_ENDPOINT_URL` | endpoint acima |
| `AWS_S3_CUSTOM_DOMAIN` | CDN opcional |
| `AWS_LOCATION` | prefixo, padrão `media` |

Salve → **Testar** (`head_bucket`). O hot-apply remonta `STORAGES` / `MEDIA_URL`.

## Amazon S3

Mesmos campos; `AWS_S3_ENDPOINT_URL` pode ficar vazio (endpoint AWS padrão) e
a região real (ex. `us-east-1`).

## Conferir

1. Instale/ative um tema ZIP pelo admin.
2. Confirme que os assets saem pela URL de mídia/CDN.
3. Upload de imagem de perfil ou notícia aparece público.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Checksum / SignatureDoesNotMatch no R2 | endpoint/região; o projeto usa checksums boto3 compatíveis com R2 |
| 403 no bucket | token sem permissão; bucket name errado |
| Mídia antiga sumiu | arquivos ficaram no volume local — migre manualmente se necessário |

Voltar: [Tutoriais](README.md).
