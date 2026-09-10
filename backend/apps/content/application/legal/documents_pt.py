"""Corpos HTML dos documentos legais em português (msgid editorial)."""

DOCUMENTS_PT: dict[str, dict[str, str]] = {
    "terms": {
        "title": "Termos de uso",
        "body": """
<p>Estes Termos de Uso (“<strong>Termos</strong>”) regulam o acesso e a utilização do painel web
<strong>{trade_name}</strong> (“<strong>Painel</strong>”, “<strong>Serviço</strong>”), operado por
<strong>{controller_name}</strong>, inscrito(a) no CNPJ <strong>{cnpj}</strong>, com sede/endereço em
<strong>{address}</strong> e contato em <a href="{contact_mailto}">{contact_email}</a>.
O software de base pode ser disponibilizado sob a marca PDL PRO; o <strong>controlador dos dados e
operador do servidor Lineage 2</strong> deste deploy é {controller_name}.</p>
<p>Ao criar uma conta, acessar ou utilizar qualquer recurso do Serviço, você (“<strong>Usuário</strong>”)
declara que leu, compreendeu e concorda com estes Termos, com a <a href="/privacy">Política de Privacidade</a>
e com o <a href="/agreement">Acordo do Usuário</a>. Se não concordar, não utilize o Serviço.</p>

<h2>1. Sobre o Serviço</h2>
<p>O {trade_name} é um painel complementar ao servidor de <strong>Lineage 2</strong>, reunindo site
público, área do jogador e ferramentas da staff. Podem estar disponíveis, conforme a configuração do
operador: vínculo de contas de jogo, personagens, inventário, carteira, loja, marketplace, leilões,
pagamentos, programas (passe de batalha, bônus), minigames, suporte, notificações e conteúdo editorial.</p>
<p>O acesso ao mundo do jogo, itens e personagens depende do banco do jogo e das regras da administração
do servidor. O Painel não substitui o cliente oficial do Lineage 2 nem concede direitos sobre a
propriedade intelectual da NCSoft ou de seus licenciantes.</p>

<h2>2. Cadastro e elegibilidade</h2>
<ol>
<li>Você deve ter pelo menos <strong>13 anos</strong>. Menores de 18 anos só podem cadastrar-se e
realizar transações financeiras com consentimento dos responsáveis legais, nos termos do art. 14 da LGPD.</li>
<li>Compromete-se a fornecer dados verdadeiros e atualizados. Podemos solicitar verificação adicional
ou suspender a conta em caso de divergência.</li>
<li>Cada pessoa física deve manter, em regra, <strong>uma conta mestra</strong> no Painel. Contas
criadas para burlar suspensões, banimentos ou benefícios serão removidas sem reembolso.</li>
<li>Você é responsável pela segurança de credenciais, 2FA, passkeys e por toda atividade na conta.</li>
</ol>

<h2>3. Conduta e fair-play</h2>
<p>É proibido, entre outras condutas:</p>
<ul>
<li>usar bots, macros, clientes modificados ou automações não autorizadas no jogo ou no Painel;</li>
<li>explorar falhas, duplicar itens, manipular economia ou comércio irregular de contas/itens (RMT);</li>
<li>praticar discurso de ódio, assédio, doxing, spam ou fraude;</li>
<li>tentar acessar áreas administrativas sem autorização, fazer scraping abusivo ou engenharia reversa
prejudicial ao Serviço.</li>
</ul>
<p>Violações podem resultar em advertência, restrição, suspensão ou banimento no Painel e/ou no jogo,
sem direito a reembolso de bens digitais afetados.</p>

<h2>4. Bens digitais</h2>
<p>Fichas, moedas do painel, itens de loja, recompensas de programas, passes e benefícios digitais
constituem <strong>licença limitada, pessoal, intransferível e revogável</strong> de uso. Não
representam dinheiro, propriedade ou valor monetário recuperável fora do ecossistema do servidor,
salvo quando a lei aplicável exigir.</p>
<p>A administração pode ajustar saldos, catálogos e mecânicas para equilibrar a economia do servidor,
com comunicação razoável quando a mudança for substancial.</p>

<h2>5. Pagamentos e reembolsos</h2>
<p>Pagamentos são processados por terceiros (por exemplo Stripe ou Mercado Pago). Dados de cartão
não devem trafegar pelos servidores do Painel. Direito de arrependimento (CDC) pode ser exercido em
até <strong>7 dias corridos</strong> quando a lei exigir e desde que o bem digital ainda não tenha
sido consumido ou creditado de forma irreversível. Falhas técnicas e cobranças duplicadas devem ser
reportadas pelo suporte.</p>

<h2>6. Propriedade intelectual</h2>
<p>Marcas, layout, código e conteúdo editorial do Painel pertencem a {controller_name} ou a seus
licenciantes (incluindo o ecossistema PDL PRO, quando aplicável). Lineage 2 e ativos correlatos
pertencem aos respectivos titulares. Concede-se apenas licença limitada de uso pessoal do Serviço.</p>

<h2>7. Suspensão e encerramento</h2>
<p>Podemos suspender ou encerrar contas que violem estes Termos. O Usuário pode solicitar encerramento
da conta pelo suporte, observado o fluxo descrito na página <a href="/lgpd">LGPD</a> e na Política
de Privacidade.</p>

<h2>8. Limitação de responsabilidade</h2>
<p>O Serviço é oferecido “como está”, sem garantia de disponibilidade ininterrupta. Não nos
responsabilizamos por instabilidade da conexão do Usuário, perda de progresso por falha em medidas
de segurança sob sua responsabilidade, ou atos de terceiros que comprometam a conta por negligência
do Usuário. A responsabilidade total, quando admitida, limita-se ao valor pago nos últimos
<strong>12 meses</strong> pelo Usuário ao operador, ressalvadas hipóteses legais imperativas.</p>

<h2>9. Alterações</h2>
<p>Podemos atualizar estes Termos a qualquer momento. O histórico público está em
<a href="/legal/history">Histórico de versões</a>. Alterações substanciais exigem
<strong>aceite explícito</strong> da nova versão no Painel para continuar usando recursos autenticados.</p>

<h2>10. Foro e legislação</h2>
<p>Estes Termos são regidos pela legislação brasileira. Fica eleito o foro de
<strong>{forum}</strong> para dirimir controvérsias, com renúncia a qualquer outro, por mais
privilegiado que seja, quando a lei permitir.</p>
""",
    },
    "privacy": {
        "title": "Política de privacidade",
        "body": """
<p><strong>{controller_name}</strong> (“nós”) trata dados pessoais no contexto do painel
<strong>{trade_name}</strong> em conformidade com a Lei Geral de Proteção de Dados
(“<strong>LGPD</strong>” — Lei 13.709/2018). Esta Política explica o que coletamos, para quê,
com quem compartilhamos e quais são seus direitos.</p>
<p>O software PDL PRO pode ser utilizado por diferentes operadores. Neste deploy, o
<strong>controlador</strong> é {controller_name} (CNPJ {cnpj}).</p>

<h2>1. Controlador e encarregado (DPO)</h2>
<p><strong>Controlador:</strong> {controller_name}, CNPJ {cnpj}, endereço {address},
contato <a href="{contact_mailto}">{contact_email}</a>.</p>
<p><strong>Encarregado (DPO):</strong> <a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>2. Dados que coletamos</h2>
<h3>2.1. Fornecidos por você</h3>
<ul>
<li>Nome de usuário, e-mail, senha (armazenada de forma irreversível), nome de exibição, bio e avatar;</li>
<li>Aceite de termos (data, versão, IP e user-agent);</li>
<li>Mensagens e anexos enviados ao suporte;</li>
<li>Preferências do assistente de ajuda (ex.: nome preferido), quando utilizadas.</li>
</ul>
<h3>2.2. Conta de jogo e economia do painel</h3>
<ul>
<li>Vínculo entre a conta do Painel e logins Lineage 2 gerenciados;</li>
<li>Dados de personagens, inventário e rankings quando a integração com o banco do jogo estiver ativa;</li>
<li>Carteira, pedidos, loja, marketplace, leilões, programas e minigames.</li>
</ul>
<h3>2.3. Coletados automaticamente</h3>
<ul>
<li>Endereço IP, user-agent, idioma e registros de segurança/auditoria;</li>
<li>Cookies essenciais de sessão (JWT HttpOnly), CSRF e preferência de idioma;</li>
<li>Inscrição Web Push (endpoint e chaves), somente se você autorizar o navegador.</li>
</ul>
<h3>2.4. Terceiros de autenticação e pagamento</h3>
<ul>
<li>Login social (Google/Discord): identificadores e e-mail fornecidos pelo provedor;</li>
<li>Pagamentos (Stripe/Mercado Pago): identificadores de pedido e metadados necessários à cobrança —
dados de cartão ficam com o gateway;</li>
<li>hCaptcha, quando habilitado no cadastro;</li>
<li>Ferramentas de monitoramento de erros (ex.: Sentry), quando configuradas.</li>
</ul>

<h2>3. Bases legais e finalidades</h2>
<table>
<thead><tr><th>Finalidade</th><th>Base legal</th><th>Exemplos</th></tr></thead>
<tbody>
<tr><td>Conta, autenticação e segurança</td><td>Execução de contrato; legítimo interesse</td><td>Login, 2FA, passkeys, logs</td></tr>
<tr><td>Painel e vínculo Lineage</td><td>Execução de contrato</td><td>Personagens, inventário, status</td></tr>
<tr><td>Compras e cobrança</td><td>Execução de contrato; obrigação legal</td><td>Pedidos, notas/recibos fiscais</td></tr>
<tr><td>Suporte</td><td>Execução de contrato; legítimo interesse</td><td>Tickets e mensagens</td></tr>
<tr><td>Prevenção a fraude e abuso</td><td>Legítimo interesse</td><td>IP, auditoria, detecção de abuso</td></tr>
<tr><td>Cookies não essenciais / push</td><td>Consentimento</td><td>Preferências do banner; Web Push</td></tr>
<tr><td>Assistente de ajuda (IA)</td><td>Execução de contrato; legítimo interesse</td><td>Mensagens enviadas à sessão de ajuda</td></tr>
</tbody>
</table>

<h2>4. Compartilhamento</h2>
<p>Compartilhamos dados estritamente necessários com operadores como gateways de pagamento,
provedores OAuth, hCaptcha, infraestrutura de hospedagem/e-mail e, quando aplicável, provedores
de modelo de linguagem usados pelo assistente. <strong>Não vendemos</strong> dados pessoais.</p>

<h2>5. Retenção</h2>
<ul>
<li>Conta: enquanto ativa e pelos prazos legais após encerramento;</li>
<li>Pedidos e dados fiscais: conforme obrigação legal aplicável;</li>
<li>Tickets de suporte: até 5 anos, salvo necessidade maior;</li>
<li>Logs de segurança: tipicamente até 6 meses (Marco Civil), podendo estender-se em investigações;</li>
<li>Exportações temporárias de dados: prazo curto com expiração automática, quando disponíveis.</li>
</ul>

<h2>6. Direitos do titular</h2>
<p>Nos termos do art. 18 da LGPD, você pode confirmar tratamento, acessar, corrigir, anonimizar,
bloquear, eliminar, portar dados, revogar consentimento e obter informação sobre compartilhamento.
Nesta versão, os pedidos são atendidos pelo <strong>suporte</strong> e pelo e-mail do DPO
<a href="{dpo_mailto}">{dpo_email}</a>, com prazo de resposta de até 15 dias. Detalhes em
<a href="/lgpd">LGPD</a>.</p>

<h2>7. Cookies</h2>
<p>Consulte a <a href="/cookies">Política de Cookies</a> e gerencie preferências pelo banner.</p>

<h2>8. Transferências internacionais</h2>
<p>Alguns operadores (nuvem, OAuth, pagamento, monitoramento) podem processar dados fora do Brasil.
Adotamos salvaguardas contratuais e técnicas adequadas quando aplicável.</p>

<h2>9. Menores</h2>
<p>O Serviço não se destina a menores de 13 anos. Responsáveis devem supervisionar o uso por
adolescentes e o consentimento para tratamentos que o exigirem.</p>

<h2>10. Segurança</h2>
<p>Adotamos medidas técnicas e organizacionais razoáveis (HTTPS, cookies HttpOnly, hashing de senha,
controles de acesso). Nenhum sistema é 100% seguro; notifique incidentes ao DPO.</p>

<h2>11. Alterações</h2>
<p>Atualizações constam do <a href="/legal/history">histórico de versões</a>. Mudanças substanciais
exigem novo aceite explícito da versão dos documentos legais.</p>
""",
    },
    "agreement": {
        "title": "Acordo do usuário",
        "body": """
<p>Este Acordo do Usuário (“<strong>Acordo</strong>”) complementa os
<a href="/terms">Termos de Uso</a> e a <a href="/privacy">Política de Privacidade</a> do
<strong>{trade_name}</strong>, operado por <strong>{controller_name}</strong>.</p>

<h2>1. Licença de uso</h2>
<p>Concedemos licença pessoal, limitada, não exclusiva, intransferível e revogável para acessar o
Painel conforme estes documentos. Não há cessão de propriedade sobre software, marcas ou conteúdo.</p>

<h2>2. Conta única e responsabilidade</h2>
<p>Você concorda em manter uma conta mestra sob seu controle, não compartilhar credenciais e não
permitir que terceiros usem sua conta para violar regras do servidor ou deste Acordo.</p>

<h2>3. Fair-play no Lineage 2 e no Painel</h2>
<p>O uso de bots, exploits, real money trading não autorizado, manipulação de rankings/economia e
qualquer conduta que prejudique a comunidade pode resultar em sanções no jogo e no Painel.</p>

<h2>4. Conteúdo gerado pelo usuário</h2>
<p>Mensagens de suporte, nomes de exibição, avatares e demais conteúdos enviados devem respeitar a
lei e as regras da comunidade. Você concede ao operador licença para armazenar e exibir esse
conteúdo na medida necessária à prestação do Serviço e à moderação.</p>

<h2>5. Bens digitais e programas</h2>
<p>Itens, fichas, recompensas de passe, minigames e benefícios são licenças de uso no ecossistema
do servidor. Podem ser alterados, corrigidos ou removidos para manutenção do equilíbrio, segurança
ou cumprimento legal.</p>

<h2>6. Comunicações</h2>
<p>Podemos enviar e-mails transacionais (segurança, pedidos, verificação). Comunicações promocionais,
quando houver, dependerão de base legal adequada (consentimento ou legítimo interesse com opt-out).</p>

<h2>7. Integração com o banco do jogo</h2>
<p>Operações que leem ou escrevem no banco Lineage 2 (quando habilitadas) ocorrem sob as regras da
administração. Falhas de sincronização devem ser reportadas ao suporte; retries e recibos existem
para reduzir duplicidades, mas você deve evitar reenviar ações manualmente sem orientação.</p>

<h2>8. Encerramento</h2>
<p>O descumprimento deste Acordo autoriza suspensão ou encerramento. O pedido de exclusão de conta
segue a Política de Privacidade e a página LGPD.</p>

<h2>9. Conflito entre documentos</h2>
<p>Em caso de conflito, prevalecem, nesta ordem: (1) obrigações legais imperativas; (2) Política de
Privacidade quanto a dados pessoais; (3) Termos de Uso; (4) este Acordo.</p>
""",
    },
    "cookies": {
        "title": "Política de cookies",
        "body": """
<p>Esta Política descreve como o <strong>{trade_name}</strong>, operado por
<strong>{controller_name}</strong>, utiliza cookies e tecnologias semelhantes.</p>

<h2>1. O que são cookies</h2>
<p>Cookies são pequenos arquivos armazenados no seu navegador. Também usamos armazenamento local
(localStorage) para preferências de consentimento e idioma da interface.</p>

<h2>2. Categorias</h2>
<table>
<thead><tr><th>Categoria</th><th>Essencial?</th><th>Exemplos</th></tr></thead>
<tbody>
<tr><td>Essenciais</td><td>Sim</td><td>Sessão JWT (<code>PDL-auth</code>, <code>PDL-refresh</code>), CSRF, segurança</td></tr>
<tr><td>Funcionais</td><td>Não</td><td>Preferências de interface além do mínimo necessário</td></tr>
<tr><td>Analíticos</td><td>Não</td><td>Métricas de uso, quando o operador ativar ferramentas de analytics</td></tr>
<tr><td>Marketing</td><td>Não</td><td>Campanhas de terceiros, somente se configuradas e consentidas</td></tr>
</tbody>
</table>
<p>Cookies essenciais não podem ser desativados pelo banner, pois são necessários ao login e à
proteção da conta.</p>

<h2>3. Preferência de idioma</h2>
<p>O cookie/localStorage de idioma memoriza pt, en ou es para exibir o Painel e conteúdos editoriais
no idioma escolhido.</p>

<h2>4. Web Push</h2>
<p>Notificações push usam permissão do navegador e não substituem o consentimento de cookies.
Você pode revogar a permissão nas configurações do navegador e do Painel.</p>

<h2>5. Como gerenciar</h2>
<p>Use o banner de cookies ou reabra as preferências nesta página. Você também pode limpar cookies
pelo navegador; isso pode encerrar a sessão.</p>

<h2>6. Atualizações</h2>
<p>A versão desta política acompanha o pacote legal vigente
(<a href="/legal/history">histórico</a>). Mudança de versão do consentimento de cookies pode
solicitar nova escolha no banner.</p>
""",
    },
    "lgpd": {
        "title": "LGPD e direitos do titular",
        "body": """
<p>Esta página resume como o <strong>{trade_name}</strong> atende à LGPD (Lei 13.709/2018).
O controlador deste deploy é <strong>{controller_name}</strong> (CNPJ {cnpj}). DPO:
<a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>1. Princípios</h2>
<p>Tratamos dados com finalidade, adequação, necessidade, livre acesso, qualidade, transparência,
segurança, prevenção, não discriminação e responsabilização.</p>

<h2>2. Seus direitos (art. 18)</h2>
<ul>
<li>confirmação da existência de tratamento;</li>
<li>acesso aos dados;</li>
<li>correção de dados incompletos, inexatos ou desatualizados;</li>
<li>anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
<li>portabilidade, observados segredos comercial e industrial;</li>
<li>eliminação dos dados tratados com consentimento, ressalvadas hipóteses legais;</li>
<li>informação sobre entidades públicas e privadas com as quais compartilhamos dados;</li>
<li>informação sobre a possibilidade de não consentir e consequências;</li>
<li>revogação do consentimento.</li>
</ul>

<h2>3. Como exercer</h2>
<ol>
<li>Abra um chamado no <strong>suporte</strong> do Painel, ou</li>
<li>Escreva ao DPO em <a href="{dpo_mailto}">{dpo_email}</a> com o e-mail da conta e a descrição do pedido.</li>
</ol>
<p>Resposta em até <strong>15 dias</strong>, prorrogáveis conforme a LGPD. Podemos solicitar
confirmação de identidade para proteger a conta.</p>

<h2>4. Portabilidade e exclusão</h2>
<p>Nesta versão do produto, portabilidade e exclusão/anonimização são atendidas via suporte.
Prazos de conclusão podem chegar a até 90 dias quando houver obrigações legais de retenção
(ex.: registros financeiros) ou necessidade de anonimizar vínculos com o banco do jogo.</p>

<h2>5. Decisões automatizadas</h2>
<p>Filtros de segurança, antiabuso e moderação podem usar regras automatizadas. Você pode solicitar
revisão humana pelo suporte quando uma decisão automatizada afetar significativamente seus interesses.</p>

<h2>6. Incidentes</h2>
<p>Em caso de incidente de segurança relevante, adotaremos medidas de contenção e comunicaremos
titulares e a ANPD quando a lei exigir.</p>

<h2>7. ANPD</h2>
<p>Você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</p>

<h2>8. Documentos relacionados</h2>
<p><a href="/privacy">Política de Privacidade</a> · <a href="/cookies">Cookies</a> ·
<a href="/terms">Termos</a> · <a href="/legal/history">Histórico</a></p>
""",
    },
}
