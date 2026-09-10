"""Cuerpos HTML de los documentos legales en español."""

DOCUMENTS_ES: dict[str, dict[str, str]] = {
    "terms": {
        "title": "Términos de uso",
        "body": """
<p>Estos Términos de Uso (“<strong>Términos</strong>”) regulan el acceso y uso del panel web
<strong>{trade_name}</strong> (“<strong>Panel</strong>”, “<strong>Servicio</strong>”), operado por
<strong>{controller_name}</strong>, CNPJ <strong>{cnpj}</strong>, con domicilio en
<strong>{address}</strong> y contacto <a href="{contact_mailto}">{contact_email}</a>.
El software base puede ofrecerse bajo la marca PDL PRO; el <strong>controlador de datos y operador
del servidor Lineage 2</strong> de este despliegue es {controller_name}.</p>
<p>Al crear una cuenta, acceder o usar cualquier recurso del Servicio, usted (“<strong>Usuario</strong>”)
declara haber leído y aceptado estos Términos, la <a href="/privacy">Política de privacidad</a> y el
<a href="/agreement">Acuerdo del usuario</a>. Si no está de acuerdo, no utilice el Servicio.</p>

<h2>1. Sobre el Servicio</h2>
<p>{trade_name} es un panel complementario a un servidor de <strong>Lineage 2</strong>, con sitio
público, área del jugador y herramientas del staff. Según la configuración del operador, pueden
existir vínculo de cuentas de juego, personajes, inventario, cartera, tienda, marketplace, subastas,
pagos, programas (pase de batalla, bonos), minijuegos, soporte, notificaciones y contenido editorial.</p>
<p>El acceso al mundo del juego, objetos y personajes depende de la base del juego y de las reglas
de la administración. El Panel no sustituye el cliente de Lineage 2 ni otorga derechos sobre la
propiedad intelectual de NCSoft.</p>

<h2>2. Registro y elegibilidad</h2>
<ol>
<li>Debe tener al menos <strong>13 años</strong>. Los menores de 18 solo pueden registrarse y
realizar pagos con consentimiento de los responsables legales, conforme a la ley aplicable
(incluido el art. 14 de la LGPD en Brasil).</li>
<li>Debe proporcionar datos veraces. Podemos solicitar verificación adicional o suspender la cuenta.</li>
<li>Como regla, cada persona mantiene <strong>una cuenta maestra</strong>. Las cuentas creadas para
eludir sanciones o abusar de promociones pueden eliminarse sin reembolso.</li>
<li>Usted es responsable de credenciales, 2FA, passkeys y de toda actividad en la cuenta.</li>
</ol>

<h2>3. Conducta y fair-play</h2>
<p>Está prohibido usar bots, macros o clientes no autorizados, explotar fallos, comerciar cuentas/objetos
de forma irregular (RMT), discurso de odio, acoso, doxing, spam, fraude, acceso admin no autorizado,
scraping abusivo e ingeniería inversa perjudicial. Las infracciones pueden derivar en advertencias,
restricciones, suspensión o ban en el Panel y/o en el juego, sin reembolso de bienes digitales afectados.</p>

<h2>4. Bienes digitales</h2>
<p>Fichas, monedas del panel, objetos de tienda, recompensas, pases y beneficios digitales constituyen
una <strong>licencia limitada, personal, intransferible y revocable</strong>. No son dinero ni valor
monetario recuperable fuera del ecosistema del servidor, salvo obligación legal. La administración
puede ajustar saldos y catálogos para equilibrar la economía.</p>

<h2>5. Pagos y reembolsos</h2>
<p>Los pagos se procesan por terceros (p. ej. Stripe o Mercado Pago). Los datos de tarjeta no deben
transitar por los servidores del Panel. El derecho de arrepentimiento puede ejercerse en hasta
<strong>7 días corridos</strong> cuando la ley lo exija y el bien digital no se haya consumido de
forma irreversible. Reporte fallos técnicos al soporte.</p>

<h2>6. Propiedad intelectual</h2>
<p>Marcas, diseño, código y contenido editorial del Panel pertenecen a {controller_name} o a sus
licenciantes (incluido el ecosistema PDL PRO cuando aplique). Lineage 2 pertenece a sus titulares.
Solo se concede una licencia personal limitada de uso del Servicio.</p>

<h2>7. Suspensión y cierre</h2>
<p>Podemos suspender o cerrar cuentas que incumplan estos Términos. Puede solicitar el cierre por
soporte, conforme a la página <a href="/lgpd">LGPD</a> y la Política de privacidad.</p>

<h2>8. Limitación de responsabilidad</h2>
<p>El Servicio se ofrece “tal cual”, sin garantía de disponibilidad ininterrumpida. No respondemos por
inestabilidad de su conexión, pérdida de progreso por fallas de seguridad bajo su responsabilidad, ni
actos de terceros que comprometan la cuenta por su negligencia. Cuando se admita responsabilidad, se
limita a lo pagado al operador en los últimos <strong>12 meses</strong>, salvo excepciones legales.</p>

<h2>9. Cambios</h2>
<p>Podemos actualizar estos Términos en cualquier momento. Consulte el
<a href="/legal/history">historial de versiones</a>. Los cambios sustanciales exigen
<strong>aceptación explícita</strong> de la nueva versión en el Panel.</p>

<h2>10. Ley aplicable</h2>
<p>Estos Términos se rigen por la legislación brasileña. Queda elegida la jurisdicción de
<strong>{forum}</strong>, con renuncia a cualquier otra en la medida permitida por la ley.</p>
""",
    },
    "privacy": {
        "title": "Política de privacidad",
        "body": """
<p><strong>{controller_name}</strong> (“nosotros”) trata datos personales en el panel
<strong>{trade_name}</strong> conforme a la LGPD brasileña (Ley 13.709/2018). Esta Política explica
qué recopilamos, para qué, con quién compartimos y cuáles son sus derechos.</p>
<p>El software PDL PRO puede ser usado por distintos operadores. En este despliegue, el
<strong>controlador</strong> es {controller_name} (CNPJ {cnpj}).</p>

<h2>1. Controlador y DPO</h2>
<p><strong>Controlador:</strong> {controller_name}, CNPJ {cnpj}, dirección {address},
contacto <a href="{contact_mailto}">{contact_email}</a>.</p>
<p><strong>Encargado (DPO):</strong> <a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>2. Datos que recopilamos</h2>
<h3>2.1. Proporcionados por usted</h3>
<ul>
<li>Nombre de usuario, correo, contraseña (con hash irreversible), nombre visible, bio y avatar;</li>
<li>Aceptación de términos (fecha, versión, IP y user-agent);</li>
<li>Mensajes y adjuntos de soporte;</li>
<li>Preferencias del asistente de ayuda (p. ej. nombre preferido), cuando se usen.</li>
</ul>
<h3>2.2. Cuenta de juego y economía del panel</h3>
<ul>
<li>Vínculo entre la cuenta del Panel y logins Lineage 2 gestionados;</li>
<li>Datos de personajes, inventario y rankings cuando la integración con la base del juego esté activa;</li>
<li>Cartera, pedidos, tienda, marketplace, subastas, programas y minijuegos.</li>
</ul>
<h3>2.3. Recopilados automáticamente</h3>
<ul>
<li>Dirección IP, user-agent, idioma y registros de seguridad/auditoría;</li>
<li>Cookies esenciales de sesión (JWT HttpOnly), CSRF y preferencia de idioma;</li>
<li>Suscripción Web Push solo si autoriza el navegador.</li>
</ul>
<h3>2.4. Terceros de autenticación y pago</h3>
<ul>
<li>Login social (Google/Discord): identificadores y correo del proveedor;</li>
<li>Pagos (Stripe/Mercado Pago): identificadores de pedido y metadatos — los datos de tarjeta quedan en el gateway;</li>
<li>hCaptcha cuando esté habilitado en el registro;</li>
<li>Herramientas de monitoreo de errores (p. ej. Sentry) cuando estén configuradas.</li>
</ul>

<h2>3. Bases legales y finalidades</h2>
<table>
<thead><tr><th>Finalidad</th><th>Base legal</th><th>Ejemplos</th></tr></thead>
<tbody>
<tr><td>Cuenta, autenticación y seguridad</td><td>Ejecución de contrato; interés legítimo</td><td>Login, 2FA, passkeys, logs</td></tr>
<tr><td>Panel y vínculo Lineage</td><td>Ejecución de contrato</td><td>Personajes, inventario, estado</td></tr>
<tr><td>Compras y facturación</td><td>Contrato; obligación legal</td><td>Pedidos, registros fiscales</td></tr>
<tr><td>Soporte</td><td>Contrato; interés legítimo</td><td>Tickets y mensajes</td></tr>
<tr><td>Prevención de fraude y abuso</td><td>Interés legítimo</td><td>IP, auditoría, detección de abuso</td></tr>
<tr><td>Cookies no esenciales / push</td><td>Consentimiento</td><td>Preferencias del banner; Web Push</td></tr>
<tr><td>Asistente de ayuda (IA)</td><td>Contrato; interés legítimo</td><td>Mensajes enviados en la ayuda</td></tr>
</tbody>
</table>

<h2>4. Compartición</h2>
<p>Compartimos datos estrictamente necesarios con pasarelas de pago, proveedores OAuth, hCaptcha,
infraestructura de hosting/correo y, cuando aplique, proveedores de modelos de lenguaje del asistente.
<strong>No vendemos</strong> datos personales.</p>

<h2>5. Conservación</h2>
<ul>
<li>Cuenta: mientras esté activa y por plazos legales tras el cierre;</li>
<li>Pedidos y datos fiscales: según obligación legal;</li>
<li>Tickets de soporte: hasta 5 años, salvo necesidad mayor;</li>
<li>Logs de seguridad: normalmente hasta 6 meses, ampliables en investigaciones;</li>
<li>Exportaciones temporales: caducidad corta cuando existan.</li>
</ul>

<h2>6. Derechos del titular</h2>
<p>Conforme al art. 18 de la LGPD, puede confirmar el tratamiento, acceder, corregir, anonimizar,
bloquear, eliminar, portar datos, revocar el consentimiento y obtener información sobre compartición.
En esta versión, las solicitudes se atienden por <strong>soporte</strong> y el correo del DPO
<a href="{dpo_mailto}">{dpo_email}</a>, con respuesta en hasta 15 días. Detalles en
<a href="/lgpd">LGPD</a>.</p>

<h2>7. Cookies</h2>
<p>Consulte la <a href="/cookies">Política de cookies</a> y gestione preferencias con el banner.</p>

<h2>8. Transferencias internacionales</h2>
<p>Algunos operadores pueden tratar datos fuera de Brasil. Aplicamos salvaguardas contractuales y
técnicas adecuadas cuando corresponda.</p>

<h2>9. Menores</h2>
<p>El Servicio no está dirigido a menores de 13 años. Los responsables deben supervisar el uso por
adolescentes y el consentimiento cuando sea necesario.</p>

<h2>10. Seguridad</h2>
<p>Adoptamos medidas técnicas y organizativas razonables (HTTPS, cookies HttpOnly, hash de contraseña,
controles de acceso). Ningún sistema es 100% seguro; notifique incidentes al DPO.</p>

<h2>11. Cambios</h2>
<p>Las actualizaciones figuran en el <a href="/legal/history">historial de versiones</a>. Los cambios
sustanciales exigen una nueva aceptación explícita del paquete legal.</p>
""",
    },
    "agreement": {
        "title": "Acuerdo del usuario",
        "body": """
<p>Este Acuerdo del Usuario (“<strong>Acuerdo</strong>”) complementa los
<a href="/terms">Términos de uso</a> y la <a href="/privacy">Política de privacidad</a> de
<strong>{trade_name}</strong>, operado por <strong>{controller_name}</strong>.</p>

<h2>1. Licencia de uso</h2>
<p>Concedemos una licencia personal, limitada, no exclusiva, intransferible y revocable para acceder
al Panel conforme a estos documentos. No hay cesión de propiedad sobre software, marcas o contenido.</p>

<h2>2. Cuenta única</h2>
<p>Usted acepta mantener una cuenta maestra bajo su control, no compartir credenciales y no permitir
que terceros usen su cuenta para violar reglas del servidor o del Panel.</p>

<h2>3. Fair-play</h2>
<p>El uso de bots, exploits, trading de dinero real no autorizado, manipulación de rankings/economía
y conductas que perjudiquen a la comunidad puede derivar en sanciones en el juego y en el Panel.</p>

<h2>4. Contenido generado por el usuario</h2>
<p>Mensajes de soporte, nombres visibles, avatares y demás contenidos enviados deben respetar la ley
y las reglas de la comunidad. Usted otorga al operador licencia para almacenar y mostrar ese contenido
en la medida necesaria para prestar el Servicio y moderarlo.</p>

<h2>5. Bienes digitales y programas</h2>
<p>Objetos, fichas, recompensas de pase, minijuegos y beneficios son licencias de uso en el ecosistema
del servidor. Pueden modificarse, corregirse o eliminarse por equilibrio, seguridad o cumplimiento legal.</p>

<h2>6. Comunicaciones</h2>
<p>Podemos enviar correos transaccionales (seguridad, pedidos, verificación). Las comunicaciones
promocionales, si existen, requieren base legal adecuada (consentimiento o interés legítimo con opt-out).</p>

<h2>7. Integración con la base del juego</h2>
<p>Las operaciones que leen o escriben en la base Lineage 2 (cuando estén habilitadas) siguen las
reglas de la administración. Reporte fallos de sincronización al soporte; los recibos/reintentos
reducen duplicidades — evite reenviar acciones a ciegas.</p>

<h2>8. Cierre</h2>
<p>El incumplimiento de este Acuerdo autoriza la suspensión o el cierre. La eliminación de cuenta
sigue la Política de privacidad y la página LGPD.</p>

<h2>9. Conflicto entre documentos</h2>
<p>En caso de conflicto, prevalecen: (1) obligaciones legales imperativas; (2) Política de privacidad
en materia de datos personales; (3) Términos de uso; (4) este Acuerdo.</p>
""",
    },
    "cookies": {
        "title": "Política de cookies",
        "body": """
<p>Esta Política describe cómo <strong>{trade_name}</strong>, operado por
<strong>{controller_name}</strong>, utiliza cookies y tecnologías similares.</p>

<h2>1. Qué son las cookies</h2>
<p>Las cookies son pequeños archivos almacenados en su navegador. También usamos localStorage para
preferencias de consentimiento e idioma de la interfaz.</p>

<h2>2. Categorías</h2>
<table>
<thead><tr><th>Categoría</th><th>¿Esencial?</th><th>Ejemplos</th></tr></thead>
<tbody>
<tr><td>Esenciales</td><td>Sí</td><td>Sesión JWT (<code>PDL-auth</code>, <code>PDL-refresh</code>), CSRF, seguridad</td></tr>
<tr><td>Funcionales</td><td>No</td><td>Preferencias de interfaz más allá del mínimo necesario</td></tr>
<tr><td>Analíticas</td><td>No</td><td>Métricas de uso si el operador activa herramientas de analytics</td></tr>
<tr><td>Marketing</td><td>No</td><td>Campañas de terceros solo si están configuradas y consentidas</td></tr>
</tbody>
</table>
<p>Las cookies esenciales no pueden desactivarse en el banner porque son necesarias para el login y
la protección de la cuenta.</p>

<h2>3. Preferencia de idioma</h2>
<p>La cookie/localStorage de idioma recuerda pt, en o es para el Panel y el contenido editorial.</p>

<h2>4. Web Push</h2>
<p>Las notificaciones push usan el permiso del navegador y no sustituyen el consentimiento de cookies.
Puede revocar el permiso en el navegador y en el Panel.</p>

<h2>5. Cómo gestionar</h2>
<p>Use el banner de cookies o reabra las preferencias en esta página. Limpiar cookies del navegador
puede cerrar la sesión.</p>

<h2>6. Actualizaciones</h2>
<p>La versión de esta política sigue el paquete legal vigente
(<a href="/legal/history">historial</a>). Un cambio de versión del consentimiento puede pedir una
nueva elección en el banner.</p>
""",
    },
    "lgpd": {
        "title": "LGPD y derechos del titular",
        "body": """
<p>Esta página resume cómo <strong>{trade_name}</strong> cumple la LGPD brasileña (Ley 13.709/2018).
El controlador de este despliegue es <strong>{controller_name}</strong> (CNPJ {cnpj}). DPO:
<a href="{dpo_mailto}">{dpo_email}</a>.</p>

<h2>1. Principios</h2>
<p>Tratamos datos con finalidad, adecuación, necesidad, libre acceso, calidad, transparencia,
seguridad, prevención, no discriminación y rendición de cuentas.</p>

<h2>2. Sus derechos (art. 18)</h2>
<ul>
<li>confirmación de la existencia de tratamiento;</li>
<li>acceso a los datos;</li>
<li>corrección de datos incompletos, inexactos o desactualizados;</li>
<li>anonimización, bloqueo o eliminación de datos innecesarios o excesivos;</li>
<li>portabilidad, observados secretos comercial e industrial;</li>
<li>eliminación de datos tratados con consentimiento, salvo excepciones legales;</li>
<li>información sobre entidades públicas y privadas con las que compartimos datos;</li>
<li>información sobre la posibilidad de no consentir y sus consecuencias;</li>
<li>revocación del consentimiento.</li>
</ul>

<h2>3. Cómo ejercerlos</h2>
<ol>
<li>Abra un ticket de <strong>soporte</strong> en el Panel, o</li>
<li>Escriba al DPO en <a href="{dpo_mailto}">{dpo_email}</a> con el correo de la cuenta y el detalle
de la solicitud.</li>
</ol>
<p>Respuesta en hasta <strong>15 días</strong>, prorrogables conforme a la LGPD. Podemos solicitar
confirmación de identidad para proteger la cuenta.</p>

<h2>4. Portabilidad y eliminación</h2>
<p>En esta versión del producto, la portabilidad y la eliminación/anonimización se atienden vía
soporte. Los plazos pueden llegar a 90 días cuando existan obligaciones legales de conservación
(p. ej. registros financieros) o necesidad de anonimizar vínculos con la base del juego.</p>

<h2>5. Decisiones automatizadas</h2>
<p>Filtros de seguridad, antiabuso y moderación pueden usar reglas automatizadas. Puede solicitar
revisión humana por soporte cuando una decisión automatizada afecte significativamente sus intereses.</p>

<h2>6. Incidentes</h2>
<p>Ante un incidente de seguridad relevante, adoptaremos contención y comunicaremos a titulares y a
la ANPD cuando la ley lo exija.</p>

<h2>7. ANPD</h2>
<p>Puede presentar reclamación ante la Autoridad Nacional de Protección de Datos (ANPD) de Brasil.</p>

<h2>8. Documentos relacionados</h2>
<p><a href="/privacy">Política de privacidad</a> · <a href="/cookies">Cookies</a> ·
<a href="/terms">Términos</a> · <a href="/legal/history">Historial</a></p>
""",
    },
}
