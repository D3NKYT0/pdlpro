# Tutorial: Denkynho (LLM)

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Ajuda e Denkynho](../funcionalidades/ajuda.md) · [Configurador admin](../operacao/integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

Objetivo: respostas geradas na Ajuda além do FAQ. Aba **Denkynho**.

## Três modos

| Modo | Quando usar |
| --- | --- |
| Desligado (`DENKYNHO_LLM_ENABLED=false`) | Só FAQ publicado — padrão seguro |
| `remote` | Groq, OpenAI, OpenRouter, etc. (API `/v1`) |
| `ollama` | Modelo local (precisa GPU/RAM ou Compose Ollama) |

Embeddings (`DENKYNHO_EMBEDDINGS_ENABLED`) são **independentes** da geração.
Em produção o padrão evita baixar MiniLM no primeiro chat.

## API remota (mais comum na VPS)

No provedor, crie a chave API. No PDL:

| Campo | Exemplo |
| --- | --- |
| `DENKYNHO_LLM_ENABLED` | ligado |
| `DENKYNHO_LLM_PROVIDER` | `remote` |
| `DENKYNHO_LLM_API_URL` | `https://api.groq.com/openai/v1` ou `https://api.openai.com/v1` |
| `DENKYNHO_LLM_API_KEY` | bearer do provedor |
| `DENKYNHO_LLM_MODEL` | id do modelo (`openai/gpt-oss-20b`, `gpt-4o-mini`, …) |
| `DENKYNHO_LLM_TIMEOUT` | `60`–`120` |

Salve → **Testar**.

Alternativa via shell na pasta da instalação:

```bash
./setup.sh configure-production --yes \
  --denkynho-provider remote \
  --denkynho-api-url https://api.groq.com/openai/v1 \
  --denkynho-api-key gsk-... \
  --denkynho-model openai/gpt-oss-20b
```

## Ollama local

1. Suba o overlay `docker-compose.ollama.yml` (veja [Ajuda](../funcionalidades/ajuda.md)).
2. `DENKYNHO_LLM_PROVIDER=ollama`, URL `http://ollama:11434` com
   `DENKYNHO_OLLAMA_DOCKER` ligado, ou loopback no host.
3. Puxe o modelo (`ollama pull …`) e informe a tag em `DENKYNHO_LLM_MODEL`.

VPS pequena costuma **não** aguentar Ollama — prefira `remote`.

## Conferir

1. Publique ao menos um FAQ relevante.
2. `/panel/help` → faça uma pergunta.
3. Sem LLM: só FAQ. Com LLM: resposta gerada respeitando as fontes.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Teste timeout | modelo lento; aumente timeout; provedor fora do ar |
| 401 na API | chave errada ou URL sem `/v1` |
| Worker baixa modelo sem querer | embeddings ligados — desligue se não precisar |

Voltar: [Tutoriais](README.md).
