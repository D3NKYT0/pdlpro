"""HTML bodies for legal documents in English."""

DOCUMENTS_EN: dict[str, dict[str, str]] = {
    "terms": {
        "title": "Terms of use",
        "body": """
<p>These Terms of Use (“<strong>Terms</strong>”) govern access to and use of the web panel
<strong>{trade_name}</strong> (“<strong>Panel</strong>”, “<strong>Service</strong>”), operated by
<strong>{controller_name}</strong>, tax ID <strong>{cnpj}</strong>, located at
<strong>{address}</strong>, contact <a href="{contact_mailto}">{contact_email}</a>.
The underlying software may be provided under the PDL PRO brand; the <strong>data controller and
Lineage 2 server operator</strong> for this deployment is {controller_name}.</p>
<p>By creating an account, accessing, or using any feature of the Service, you (“<strong>User</strong>”)
confirm that you have read and agree to these Terms, the <a href="/privacy">Privacy Policy</a>, and the
<a href="/agreement">User Agreement</a>. If you do not agree, do not use the Service.</p>

<h2>1. About the Service</h2>
<p>{trade_name} is a complementary panel for a <strong>Lineage 2</strong> server, including the public
site, player area, and staff tools. Depending on operator configuration, features may include game
account linking, characters, inventory, wallet, shop, marketplace, auctions, payments, programs
(battle pass, bonuses), minigames, support, notifications, and editorial content.</p>
<p>Access to the game world, items, and characters depends on the game database and server rules.
The Panel does not replace the Lineage 2 client and grants no rights over NCSoft intellectual property.</p>

<h2>2. Registration and eligibility</h2>
<ol>
<li>You must be at least <strong>13 years</strong> old. Users under 18 may register and make payments
only with guardian consent, as required by applicable law (including LGPD art. 14 in Brazil).</li>
<li>You must provide accurate information. We may request extra verification or suspend the account.</li>
<li>As a rule, each person may keep <strong>one master account</strong>. Accounts created to evade
bans or abuse promotions may be removed without refund.</li>
<li>You are responsible for credentials, 2FA, passkeys, and all activity on your account.</li>
</ol>

<h2>3. Conduct and fair play</h2>
<p>Prohibited conduct includes bots, unauthorized macros/clients, exploiting bugs, irregular
item/account trading (RMT), hate speech, harassment, doxing, spam, fraud, unauthorized admin access,
abusive scraping, and harmful reverse engineering. Violations may lead to warnings, restrictions,
suspension, or bans in the Panel and/or game, without refund of affected digital goods.</p>

<h2>4. Digital goods</h2>
<p>Tokens, panel currency, shop items, program rewards, passes, and digital benefits are a
<strong>limited, personal, non-transferable, revocable license</strong>. They are not money or
recoverable monetary value outside the server ecosystem, except where mandatory law requires otherwise.
The administration may adjust balances and catalogs to keep the economy healthy.</p>

<h2>5. Payments and refunds</h2>
<p>Payments are processed by third parties (e.g. Stripe or Mercado Pago). Card data should not transit
Panel servers. Cooling-off rights may apply within <strong>7 calendar days</strong> when required by law
and if the digital good has not been irreversibly consumed. Report technical failures via support.</p>

<h2>6. Intellectual property</h2>
<p>Panel brands, layout, code, and editorial content belong to {controller_name} or its licensors
(including the PDL PRO ecosystem when applicable). Lineage 2 assets belong to their respective owners.
You receive only a limited personal license to use the Service.</p>

<h2>7. Suspension and termination</h2>
<p>We may suspend or terminate accounts that violate these Terms. You may request account closure via
support, subject to the <a href="/lgpd">LGPD</a> page and Privacy Policy.</p>

<h2>8. Limitation of liability</h2>
<p>The Service is provided “as is” without uninterrupted availability guarantees. We are not liable for
your connection issues, progress loss due to weak personal security practices, or third-party account
compromise caused by your negligence. Where liability is admitted, it is limited to amounts you paid
to the operator in the last <strong>12 months</strong>, except for mandatory legal exceptions.</p>

<h2>9. Changes</h2>
<p>We may update these Terms at any time. See the public <a href="/legal/history">version history</a>.
Substantial changes require <strong>explicit acceptance</strong> of the new version in the Panel.</p>

<h2>10. Governing law</h2>
<p>These Terms are governed by Brazilian law. The courts of <strong>{forum}</strong> shall have
jurisdiction, waiving any other venue to the extent permitted by law.</p>
""",
    },
    "privacy": {
        "title": "Privacy policy",
        "body": """
<p><strong>{controller_name}</strong> (“we”) processes personal data in the
<strong>{trade_name}</strong> panel under Brazil’s LGPD (Law 13.709/2018). This Policy explains what
we collect, why, with whom we share it, and your rights.</p>
<p>PDL PRO software may be used by different operators. In this deployment, the
<strong>controller</strong> is {controller_name} (tax ID {cnpj}).</p>

<h2>1. Controller and DPO</h2>
<p><strong>Controller:</strong> {controller_name}, tax ID {cnpj}, address {address},
contact <a href="{contact_mailto}">{contact_email}</a>.</p>
<p><strong>Data Protection Officer:</strong> <a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>2. Data we collect</h2>
<h3>2.1. Provided by you</h3>
<ul>
<li>Username, email, password (irreversibly hashed), display name, bio, and avatar;</li>
<li>Terms acceptance (timestamp, version, IP, and user-agent);</li>
<li>Support messages and attachments;</li>
<li>Help-assistant preferences (e.g. preferred name), when used.</li>
</ul>
<h3>2.2. Game account and panel economy</h3>
<ul>
<li>Links between the Panel account and managed Lineage 2 logins;</li>
<li>Character, inventory, and ranking data when game-DB integration is enabled;</li>
<li>Wallet, orders, shop, marketplace, auctions, programs, and minigames.</li>
</ul>
<h3>2.3. Collected automatically</h3>
<ul>
<li>IP address, user-agent, language, and security/audit logs;</li>
<li>Essential session cookies (HttpOnly JWT), CSRF, and language preference;</li>
<li>Web Push subscription data only if you grant browser permission.</li>
</ul>
<h3>2.4. Auth and payment third parties</h3>
<ul>
<li>Social login (Google/Discord): provider identifiers and email;</li>
<li>Payments (Stripe/Mercado Pago): order identifiers and billing metadata — card data stays with the gateway;</li>
<li>hCaptcha when enabled on registration;</li>
<li>Error monitoring tools (e.g. Sentry) when configured.</li>
</ul>

<h2>3. Legal bases and purposes</h2>
<table>
<thead><tr><th>Purpose</th><th>Legal basis</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>Account, auth, security</td><td>Contract performance; legitimate interest</td><td>Login, 2FA, passkeys, logs</td></tr>
<tr><td>Panel and Lineage link</td><td>Contract performance</td><td>Characters, inventory, status</td></tr>
<tr><td>Purchases and billing</td><td>Contract; legal obligation</td><td>Orders, fiscal records</td></tr>
<tr><td>Support</td><td>Contract; legitimate interest</td><td>Tickets and messages</td></tr>
<tr><td>Fraud and abuse prevention</td><td>Legitimate interest</td><td>IP, audit, abuse detection</td></tr>
<tr><td>Non-essential cookies / push</td><td>Consent</td><td>Banner preferences; Web Push</td></tr>
<tr><td>Help assistant (AI)</td><td>Contract; legitimate interest</td><td>Messages sent in help sessions</td></tr>
</tbody>
</table>

<h2>4. Sharing</h2>
<p>We share strictly necessary data with payment gateways, OAuth providers, hCaptcha, hosting/email
infrastructure, and, when applicable, language-model providers used by the assistant.
We <strong>do not sell</strong> personal data.</p>

<h2>5. Retention</h2>
<ul>
<li>Account: while active and for legal periods after closure;</li>
<li>Orders and fiscal data: as required by law;</li>
<li>Support tickets: up to 5 years unless longer need;</li>
<li>Security logs: typically up to 6 months, extendable for investigations;</li>
<li>Temporary data exports: short expiry when available.</li>
</ul>

<h2>6. Your rights</h2>
<p>Under LGPD art. 18 you may confirm processing, access, correct, anonymize, block, delete, port
data, revoke consent, and obtain sharing information. In this product version, requests are handled
via <strong>support</strong> and the DPO email <a href="{dpo_mailto}">{dpo_email}</a>, with a response
within 15 days. See <a href="/lgpd">LGPD</a>.</p>

<h2>7. Cookies</h2>
<p>See the <a href="/cookies">Cookie Policy</a> and manage preferences via the banner.</p>

<h2>8. International transfers</h2>
<p>Some processors may handle data outside Brazil. We apply appropriate contractual and technical
safeguards when required.</p>

<h2>9. Children</h2>
<p>The Service is not directed at children under 13. Guardians must supervise adolescent use and
consent where required.</p>

<h2>10. Security</h2>
<p>We apply reasonable technical and organizational measures (HTTPS, HttpOnly cookies, password
hashing, access controls). No system is perfectly secure; report incidents to the DPO.</p>

<h2>11. Changes</h2>
<p>Updates appear in the <a href="/legal/history">version history</a>. Substantial changes require
a new explicit acceptance of the legal pack version.</p>
""",
    },
    "agreement": {
        "title": "User agreement",
        "body": """
<p>This User Agreement (“<strong>Agreement</strong>”) complements the
<a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a> of
<strong>{trade_name}</strong>, operated by <strong>{controller_name}</strong>.</p>

<h2>1. License</h2>
<p>We grant a personal, limited, non-exclusive, non-transferable, revocable license to access the
Panel under these documents. No ownership of software, brands, or content is transferred.</p>

<h2>2. Single account</h2>
<p>You agree to keep one master account under your control, not share credentials, and not allow
others to use your account to break server or Panel rules.</p>

<h2>3. Fair play</h2>
<p>Bots, exploits, unauthorized real-money trading, ranking/economy manipulation, and conduct that
harms the community may lead to sanctions in-game and in the Panel.</p>

<h2>4. User-generated content</h2>
<p>Support messages, display names, avatars, and other submitted content must respect the law and
community rules. You grant the operator a license to store and display such content as needed to
provide the Service and moderate it.</p>

<h2>5. Digital goods and programs</h2>
<p>Items, tokens, battle-pass rewards, minigames, and benefits are usage licenses within the server
ecosystem. They may be changed, fixed, or removed for balance, security, or legal compliance.</p>

<h2>6. Communications</h2>
<p>We may send transactional emails (security, orders, verification). Promotional messages, if any,
require an appropriate legal basis (consent or legitimate interest with opt-out).</p>

<h2>7. Game database integration</h2>
<p>Operations that read or write the Lineage 2 database (when enabled) follow administration rules.
Report sync issues to support; receipts/retries reduce duplicates—avoid blindly re-submitting actions.</p>

<h2>8. Termination</h2>
<p>Breach of this Agreement may lead to suspension or termination. Account deletion follows the
Privacy Policy and LGPD page.</p>

<h2>9. Document conflict</h2>
<p>In case of conflict, the order of precedence is: (1) mandatory law; (2) Privacy Policy for personal
data; (3) Terms of Use; (4) this Agreement.</p>
""",
    },
    "cookies": {
        "title": "Cookie policy",
        "body": """
<p>This Policy describes how <strong>{trade_name}</strong>, operated by
<strong>{controller_name}</strong>, uses cookies and similar technologies.</p>

<h2>1. What cookies are</h2>
<p>Cookies are small files stored in your browser. We also use localStorage for consent preferences
and UI language.</p>

<h2>2. Categories</h2>
<table>
<thead><tr><th>Category</th><th>Essential?</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>Essential</td><td>Yes</td><td>JWT session (<code>PDL-auth</code>, <code>PDL-refresh</code>), CSRF, security</td></tr>
<tr><td>Functional</td><td>No</td><td>UI preferences beyond the bare minimum</td></tr>
<tr><td>Analytics</td><td>No</td><td>Usage metrics if the operator enables analytics tools</td></tr>
<tr><td>Marketing</td><td>No</td><td>Third-party campaigns only if configured and consented</td></tr>
</tbody>
</table>
<p>Essential cookies cannot be disabled via the banner because they are required for login and
account protection.</p>

<h2>3. Language preference</h2>
<p>Language cookie/localStorage remembers pt, en, or es for the Panel and editorial content.</p>

<h2>4. Web Push</h2>
<p>Push notifications use browser permission and do not replace cookie consent. You may revoke
permission in the browser and Panel settings.</p>

<h2>5. How to manage</h2>
<p>Use the cookie banner or reopen preferences on this page. Clearing browser cookies may end your
session.</p>

<h2>6. Updates</h2>
<p>This policy version follows the current legal pack (<a href="/legal/history">history</a>).
A cookie-consent version bump may ask you to choose again.</p>
""",
    },
    "lgpd": {
        "title": "LGPD and data-subject rights",
        "body": """
<p>This page summarizes how <strong>{trade_name}</strong> complies with Brazil’s LGPD
(Law 13.709/2018). The controller for this deployment is <strong>{controller_name}</strong>
(tax ID {cnpj}). DPO: <a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>1. Principles</h2>
<p>We process data with purpose, adequacy, necessity, free access, quality, transparency, security,
prevention, non-discrimination, and accountability.</p>

<h2>2. Your rights (art. 18)</h2>
<ul>
<li>confirmation that processing exists;</li>
<li>access to data;</li>
<li>correction of incomplete, inaccurate, or outdated data;</li>
<li>anonymization, blocking, or deletion of unnecessary or excessive data;</li>
<li>portability, subject to trade and industrial secrets;</li>
<li>deletion of data processed based on consent, except legal exceptions;</li>
<li>information about public and private entities with which we share data;</li>
<li>information about the option not to consent and consequences;</li>
<li>revocation of consent.</li>
</ul>

<h2>3. How to exercise</h2>
<ol>
<li>Open a <strong>support</strong> ticket in the Panel, or</li>
<li>Email the DPO at <a href="{dpo_mailto}">{dpo_email}</a> with your account email and request details.</li>
</ol>
<p>Response within <strong>15 days</strong>, extendable under LGPD. We may ask for identity
confirmation to protect the account.</p>

<h2>4. Portability and deletion</h2>
<p>In this product version, portability and deletion/anonymization are handled via support.
Completion may take up to 90 days when legal retention (e.g. financial records) or game-DB link
anonymization is required.</p>

<h2>5. Automated decisions</h2>
<p>Security, anti-abuse, and moderation filters may use automated rules. You may request human
review via support when an automated decision significantly affects your interests.</p>

<h2>6. Incidents</h2>
<p>For relevant security incidents we will contain impact and notify data subjects and the ANPD
when required by law.</p>

<h2>7. ANPD</h2>
<p>You may lodge a complaint with Brazil’s National Data Protection Authority (ANPD).</p>

<h2>8. Related documents</h2>
<p><a href="/privacy">Privacy Policy</a> · <a href="/cookies">Cookies</a> ·
<a href="/terms">Terms</a> · <a href="/legal/history">History</a></p>
""",
    },
}
