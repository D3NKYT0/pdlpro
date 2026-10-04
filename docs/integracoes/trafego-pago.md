# Tráfego Pago e Analytics (Pixels, Google Ads e Gtag)

O PDL PRO possui suporte nativo e centralizado para ferramentas de tráfego pago,
remarketing e análise de métricas, configuráveis pelo painel administrativo, com variáveis de ambiente
(`.env`) como padrão sem necessidade de alterar o código-fonte da aplicação.

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

## Precedência e carregamento único

O backend aplica os valores salvos em **Administração → Integrações → Analytics** sobre o `.env`. A SPA aguarda `/public/server/info/` antes de carregar tags; a resposta é autoritativa, inclusive campos vazios. Um ID limpo no painel não reaparece por estar no bundle antigo. Campos ausentes em APIs antigas conservam o fallback; uma falha da API permite o fallback de build.

Com `VITE_GTM_ID` preenchido, somente `gtm.js` é carregado pelo PDL para Google. GA4 e Ads diretos ficam suspensos, mesmo com IDs preenchidos. Os eventos Google são publicados uma única vez no `dataLayer`; configure as tags e conversões correspondentes no contêiner. Sem GTM, o PDL usa a instalação direta. Meta e TikTok continuam independentes.

Recarregue as páginas abertas ao trocar IDs ou alternar entre instalação direta e GTM: remover um elemento `<script>` não desfaz uma biblioteca já executada. Depois de publicar esta correção, valide uma sessão nova no Tag Assistant. Para `page_view`, escolha um único disparo no contêiner: se consumir o evento da SPA, desative o envio automático da tag Google para não contar a mesma visita duas vezes. Consulte [visualizações de página do GA4](https://developers.google.com/analytics/devguides/collection/ga4/views).

Cenários de regressão: API pendente não carrega IDs de build; campo vazio desativa; painel substitui `.env`; falha da API usa fallback; GA4 + GTM não carregam dois scripts; cadastro, login, checkout, compra, evento personalizado e página seguem um único transporte. A API administrativa mantém autenticação e autorização de superusuário.

## Consentimento e diagnóstico

O bootstrap define sincronamente os quatro sinais Google antes da API e das tags.
Os comandos usam `dataLayer.push(arguments)`, conforme o protocolo de `gtag`,
e não arrays comuns. A preferência vigente é restaurada; sem escolha, os sinais
ficam negados. As bibliotecas Google só carregam após uma categoria opcional
ser autorizada, e os eventos analíticos exigem analytics. Pixels diretos Meta e
TikTok só carregam após marketing. Recusar, redefinir ou remover a preferência
em outra aba revoga imediatamente as permissões; `localStorage.clear()` também
é reconhecido. O monitoramento verifica novamente a permissão após seu import.

O PDL publica `pdl_consent_update` no `dataLayer`, com
`pdl_consent.analytics` e `pdl_consent.marketing` booleanos. No **GTM externo**,
configure as tags HTML de Meta para respeitar marketing: bloquear a inicialização
quando falso, inicializar e enviar a primeira visualização quando ficar verdadeiro,
e revogar quando voltar a falso. Não inicialize o mesmo pixel pelo PDL e pelo GTM.
Consent Mode do Google não controla automaticamente tags HTML da Meta. Configure também as tags GA4 para exigir analytics, usando os controles de consentimento do GTM, e evite eventos automáticos após revogação. Se apenas
analytics foi aceito, marketing continua negado mesmo quando o contêiner carrega.
A publicação dessas tags exige acesso ao contêiner e não é realizada pelo deploy do PDL.

Passos para o administrador do GTM:

1. Criar variáveis de camada de dados (versão 2) `pdl_consent.analytics` e
   `pdl_consent.marketing`, com padrão `false`.
2. Nas tags HTML Meta de PageView, CompleteRegistration e DiscordClick, exigir
   marketing verdadeiro. Retirar o disparo incondicional em Inicialização.
3. Usar o evento personalizado `pdl_consent_update` para inicialização tardia:
   quando marketing for verdadeiro, inicializar o pixel uma única vez e enviar
   a primeira visualização uma única vez. Não repetir `init`/PageView a cada atualização.
4. No mesmo evento com marketing falso, executar `fbq('consent', 'revoke')` se
   `fbq` existir; com verdadeiro, conceder. Isso não substitui o bloqueio dos
   acionadores dos eventos de cadastro e Discord.
5. Exigir `analytics_storage` nas tags GA4, verificar aceitação tardia e manter
   um único produtor de `page_view` (tag automática ou evento da SPA).
6. Publicar e validar essas alterações junto com o deploy do PDL. O contêiner
   publicado do cliente permanece fora do controle do repositório.


Valide em sessão limpa: nenhuma tag antes da escolha; após aceitar, confira os
quatro sinais concedidos no Tag Assistant. Repita recusa, categorias independentes,
restauração, aceitação antes/depois da API, revogação e mudança entre abas.
Confira primeira visualização sem duplicação e ausência de eventos analíticos
após revogação. Para atribuição, use links com UTMs e examine Aquisição de tráfego
após processamento: Brasil e internacional podem ser distinguidos por `utm_content`.
Não crie `session_start` manualmente nem prometa recuperar atribuição histórica.
Referência: [Consent Mode do Google](https://developers.google.com/tag-platform/security/guides/consent).

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
  o evento `page_view` é enviado automaticamente para o Google Tag **ou** GTM, além de Meta Pixel
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
