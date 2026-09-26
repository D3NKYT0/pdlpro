# Tutorial: Sentry

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Observabilidade](../operacao/observabilidade.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

Objetivo: erros e traces no Sentry. Aba **Sentry**.

## No Sentry

1. Crie projeto (plataforma Django / Python).
2. Copie o **DSN** (`https://…@….ingest.sentry.io/…`).

A imagem `web` publicada da Release **não** embute DSN de frontend. Este
tutorial cobre o backend (Django/Celery) via overlay.

## No PDL

| Campo | Valor |
| --- | --- |
| `SENTRY_DSN` | DSN do projeto |
| `SENTRY_ENVIRONMENT` | `production` |
| `SENTRY_RELEASE` | tag da versão, ex. `2.5.12` (opcional) |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0`–`1.0` (comece baixo, ex. `0.1`) |

Salve → **Testar** (valida formato/configuração). O hot-apply reinicia o SDK
no processo.

## Conferir

1. Force um erro controlado em staging (não em produção com jogadores).
2. O evento aparece no Sentry com environment/release corretos.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Nada no Sentry | DSN errado; sample rate 0; worker sem o overlay aplicado (gere tráfego após salvar) |
| Volume alto demais | reduza `SENTRY_TRACES_SAMPLE_RATE` |

Voltar: [Tutoriais](README.md).
