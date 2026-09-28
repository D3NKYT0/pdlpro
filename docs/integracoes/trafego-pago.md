# Tráfego Pago e Analytics (Pixels, Google Ads e Gtag)

O PDL PRO possui suporte nativo e centralizado para ferramentas de tráfego pago,
remarketing e análise de métricas, configuráveis diretamente via variáveis de ambiente
(`.env`) sem necessidade de alterar o código-fonte da aplicação.

---

## 1. Configuração via `.env`

No seu arquivo `.env` (ou no ambiente de produção/deploy), preencha apenas os serviços
que deseja utilizar. Serviços com valor em branco permanecem completamente desativados
sem sobrecarga na rede ou na renderização do site.

```bash
# --- Tráfego Pago & Analytics ------------------------------------------------
# Google Analytics 4 / Google Tag (ex: G-XXXXXXXXXX ou GT-XXXXXXXXXX)
VITE_GTAG_ID=G-XXXXXXXXXX

# Google Ads Conversion ID (ex: AW-123456789)
VITE_GOOGLE_ADS_ID=AW-123456789

# Google Ads Conversion Label padrão para compras e recargas de moedas (opcional)
VITE_GOOGLE_ADS_CONVERSION_LABEL=AbCdEfGhIjKlMnOpQrS

# Google Tag Manager Container ID (ex: GTM-XXXXXXX)
VITE_GTM_ID=GTM-XXXXXXX

# Meta Pixel (Facebook Pixel ID numérico, ex: 1234567890123456)
VITE_META_PIXEL_ID=1234567890123456

# TikTok Pixel ID (ex: C1234567890)
VITE_TIKTOK_PIXEL_ID=C1234567890
```

> **Atenção:** Em ambiente de produção compilado (`npm run build`), as variáveis
> `VITE_*` são embutidas durante o processo de build do Vite. Se alterar no `.env`
> de produção, reconstrua o bundle com `npm run build` ou reinicie o container Docker
> com os novos argumentos de build.

---

## 2. Ferramentas Suportadas

### Google Analytics 4 & Google Tag (`VITE_GTAG_ID`)
- Carrega o `gtag.js` oficial da Google de forma assíncrona.
- Inicia o **Google Consent Mode v2** com `analytics_storage` e `ad_storage`.
- Registra automaticamente visualizações de página na SPA sem duplicações.

### Google Ads Conversion Tracking (`VITE_GOOGLE_ADS_ID`)
- Rastreia campanhas de busca, display, YouTube e rede de parceiros do Google.
- Quando configurado em conjunto com `VITE_GOOGLE_ADS_CONVERSION_LABEL`, dispara o
  evento de conversão `conversion` assim que uma recarga de moedas é aprovada.

### Google Tag Manager (`VITE_GTM_ID`)
- Permite que a equipe de marketing gerencie tags adicionais (ex.: Hotjar, Clarity,
  Twitter/X Pixel, Pinterest) através de um contêiner GTM unificado.
- Inicializa o `dataLayer` e envia eventos de `pageview` e `purchase`.

### Meta Pixel (`VITE_META_PIXEL_ID`)
- Rastreamento oficial para anúncios no Facebook e Instagram.
- Integração com `fbevents.js` para retargeting e criação de públicos semelhantes
  (Lookalike) de jogadores e pagantes.
- Suporta `fbq('consent', 'grant')` e `fbq('consent', 'revoke')` integrado ao LGPD.

### TikTok Pixel (`VITE_TIKTOK_PIXEL_ID`)
- Rastreamento para campanhas em vídeo no TikTok.
- Dispara `ttq.page()`, `CompleteRegistration`, `InitiateCheckout` e `CompletePayment`.

---

## 3. Rastreamento Automático na SPA

Por ser uma aplicação de página única (SPA baseada em React e React Router), o sistema
possui o listener `<TrackingRouteListener />` que monitora as trocas de rota:

- **Mudança de URL:** A cada navegação (ex.: de `/` para `/panel/wallet` ou `/shop`),
  o evento `page_view` é enviado automaticamente para o Google Tag, GTM e Meta Pixel
  (`PageView`), garantindo contagem exata do funil sem necessidade de recarregar a página.

---

## 4. Eventos de Conversão Pré-Configurados

O sistema já monitora os principais marcos da jornada do jogador no servidor:

| Ação do Usuário | Google Tag (GA4 / Ads) | Meta Pixel | TikTok Pixel |
| :--- | :--- | :--- | :--- |
| **Visualização de Página** | `page_view` | `PageView` | `page` |
| **Cadastro de Nova Conta** | `sign_up` (method: email) | `CompleteRegistration` | `CompleteRegistration` |
| **Login no Painel** | `login` (method: password/2fa) | — | — |
| **Abertura do Checkout** | `begin_checkout` (value, currency) | `InitiateCheckout` | `InitiateCheckout` |
| **Recarga / Compra Confirmada** | `purchase` + `conversion` (Google Ads) | `Purchase` (value, currency, contents) | `CompletePayment` (value, currency) |

---

## 5. Conformidade com LGPD / GDPR

O PDL PRO inclui gerenciador de consentimento de cookies na SPA:
- **Cookies de Analytics:** Controlam o carregamento e disparo do Google Analytics (`gtag`).
- **Cookies de Marketing:** Controlam o Meta Pixel, TikTok Pixel e tags de remarketing do Google Ads.
- **Google Consent Mode v2:** Ativado nativamente. Se o visitante recusar cookies de
  marketing, o Google Tag opera em modo de modelagem de conversão sem cookies invasivos.
- Ao aceitar os cookies no banner inferior, as permissões são concedidas
  instantaneamente sem necessidade de recarregar a página.
