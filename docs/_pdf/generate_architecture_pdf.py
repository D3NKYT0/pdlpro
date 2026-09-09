"""Gera o PDF técnico da migração Clean Architecture + DI do PDL PRO."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "arquitetura" / "migracao-clean-architecture-di.pdf"

# Paleta: teal profundo + âmbar (evita o “look IA” roxo/creme genérico)
INK = colors.HexColor("#102A2E")
MUTED = colors.HexColor("#4A6066")
TEAL = colors.HexColor("#0E6B6E")
TEAL_DARK = colors.HexColor("#0A3F42")
TEAL_SOFT = colors.HexColor("#E6F3F3")
AMBER = colors.HexColor("#C96A2B")
AMBER_SOFT = colors.HexColor("#F8EDE3")
LINE = colors.HexColor("#C9D6D8")
WHITE = colors.white
CARD = colors.HexColor("#F7FAFA")
OK = colors.HexColor("#1F7A4D")
WARN = colors.HexColor("#8A5A12")


def _register_fonts() -> tuple[str, str]:
    candidates = [
        (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\segoeuib.ttf", "SegoeUI", "SegoeUI-Bold"),
        (r"C:\Windows\Fonts\calibri.ttf", r"C:\Windows\Fonts\calibrib.ttf", "Calibri", "Calibri-Bold"),
    ]
    for regular, bold, name, bold_name in candidates:
        if Path(regular).exists() and Path(bold).exists():
            pdfmetrics.registerFont(TTFont(name, regular))
            pdfmetrics.registerFont(TTFont(bold_name, bold))
            return name, bold_name
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_B = _register_fonts()


class ColoredBox(Flowable):
    def __init__(self, text: str, fill, border, width: float, title: str | None = None):
        super().__init__()
        self.text = text
        self.fill = fill
        self.border = border
        self.box_width = width
        self.title = title
        self._h = 0

    def wrap(self, availWidth, availHeight):
        w = min(self.box_width, availWidth)
        style = ParagraphStyle(
            "boxbody",
            fontName=FONT,
            fontSize=9.2,
            leading=13,
            textColor=INK,
            alignment=TA_JUSTIFY,
        )
        parts = []
        if self.title:
            parts.append(
                Paragraph(
                    f"<b>{self.title}</b>",
                    ParagraphStyle(
                        "boxtitle",
                        fontName=FONT_B,
                        fontSize=10,
                        leading=13,
                        textColor=TEAL_DARK,
                    ),
                )
            )
            parts.append(Spacer(1, 4))
        parts.append(Paragraph(self.text, style))
        self._flow = parts
        h = 14
        for p in parts:
            _, ph = p.wrap(w - 18, availHeight)
            h += ph + 2
        self._h = h
        self.width = w
        return w, h

    def draw(self):
        self.canv.setFillColor(self.fill)
        self.canv.setStrokeColor(self.border)
        self.canv.setLineWidth(1)
        self.canv.roundRect(0, 0, self.width, self._h, 6, fill=1, stroke=1)
        y = self._h - 10
        for p in self._flow:
            _, ph = p.wrap(self.width - 18, self._h)
            p.drawOn(self.canv, 9, y - ph)
            y -= ph + 2


class LayerBar(Flowable):
    def __init__(self, width: float):
        super().__init__()
        self.width = width
        self.height = 78

    def wrap(self, availWidth, availHeight):
        self.width = min(self.width, availWidth)
        return self.width, self.height

    def draw(self):
        layers = [
            ("Presentation", "HTTP / WebSocket / cookies", TEAL),
            ("Application", "Casos de uso e orquestração", colors.HexColor("#1A8A7A")),
            ("Domain", "Regras, portas e exceções", TEAL_DARK),
            ("Infrastructure", "ORM, gateways, providers", AMBER),
        ]
        gap = 6
        h = 14
        y = self.height - 4
        for name, desc, color in layers:
            y -= h + gap
            self.canv.setFillColor(color)
            self.canv.roundRect(0, y, self.width, h + 4, 3, fill=1, stroke=0)
            self.canv.setFillColor(WHITE)
            self.canv.setFont(FONT_B, 8.5)
            self.canv.drawString(8, y + 5, name)
            self.canv.setFont(FONT, 7.5)
            self.canv.drawRightString(self.width - 8, y + 5, desc)


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            fontName=FONT_B,
            fontSize=11,
            textColor=AMBER,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName=FONT_B,
            fontSize=26,
            leading=32,
            textColor=WHITE,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            fontName=FONT,
            fontSize=12,
            leading=17,
            textColor=colors.HexColor("#D7ECEC"),
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            fontName=FONT_B,
            fontSize=16,
            leading=20,
            textColor=TEAL_DARK,
            spaceBefore=6,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            fontName=FONT_B,
            fontSize=12.5,
            leading=16,
            textColor=TEAL,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            fontName=FONT,
            fontSize=9.6,
            leading=14,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName=FONT,
            fontSize=9.4,
            leading=13.5,
            textColor=INK,
            leftIndent=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName=FONT,
            fontSize=8.2,
            leading=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName=FONT,
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "th": ParagraphStyle(
            "th",
            fontName=FONT_B,
            fontSize=8.5,
            leading=11,
            textColor=WHITE,
        ),
        "td": ParagraphStyle(
            "td",
            fontName=FONT,
            fontSize=8.4,
            leading=11.5,
            textColor=INK,
        ),
        "td_b": ParagraphStyle(
            "td_b",
            fontName=FONT_B,
            fontSize=8.4,
            leading=11.5,
            textColor=TEAL_DARK,
        ),
        "code": ParagraphStyle(
            "code",
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=TEAL_DARK,
            backColor=TEAL_SOFT,
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
        ),
    }
    return s


def header_footer(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(1.8 * cm, A4[1] - 1.3 * cm, A4[0] - 1.8 * cm, A4[1] - 1.3 * cm)
        canvas.setFont(FONT, 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(1.8 * cm, A4[1] - 1.1 * cm, "PDL PRO · Arquitetura técnica")
        canvas.drawRightString(A4[0] - 1.8 * cm, A4[1] - 1.1 * cm, "Clean Architecture + DI")
        canvas.line(1.8 * cm, 1.2 * cm, A4[0] - 1.8 * cm, 1.2 * cm)
        canvas.drawCentredString(A4[0] / 2, 0.75 * cm, f"{doc.page}")
    canvas.restoreState()


def cover_page(story, s, width):
    story.append(Spacer(1, 2.2 * cm))
    story.append(
        Table(
            [[Paragraph("DOCUMENTO TÉCNICO", s["cover_kicker"])]],
            colWidths=[width],
        )
    )
    # Fake cover panel via table background
    cover_body = [
        [Paragraph("Migração para<br/>Clean Architecture<br/>e Injeção de Dependência", s["cover_title"])],
        [Spacer(1, 8)],
        [
            Paragraph(
                "O que mudou no backend do PDL PRO, por que mudou,<br/>"
                "e como a arquitetura em camadas passa a guiar novas features.",
                s["cover_sub"],
            )
        ],
        [Spacer(1, 18)],
        [
            Paragraph(
                "<font color='#F3C39A'>Backend · Django/DRF · Domain · Application · Infrastructure · Presentation</font>",
                ParagraphStyle(
                    "meta",
                    fontName=FONT,
                    fontSize=9,
                    alignment=TA_CENTER,
                    textColor=colors.HexColor("#F3C39A"),
                ),
            )
        ],
        [Spacer(1, 10)],
        [
            Paragraph(
                "Setembro 2026 · Suíte validada: 758 testes",
                ParagraphStyle(
                    "meta2",
                    fontName=FONT_B,
                    fontSize=10,
                    alignment=TA_CENTER,
                    textColor=WHITE,
                ),
            )
        ],
    ]
    t = Table(cover_body, colWidths=[width])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TEAL_DARK),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 22),
                ("RIGHTPADDING", (0, 0), (-1, -1), 22),
                ("BOX", (0, 0), (-1, -1), 0, TEAL_DARK),
                ("TOPPADDING", (0, 0), (-1, 0), 28),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 28),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 1.2 * cm))
    story.append(
        ColoredBox(
            "Este documento registra a conclusão da migração arquitetural do backend: "
            "regras de negócio desacopladas de Django/ORM, casos de uso orquestrados por "
            "portas, infraestrutura como adaptador e presentation fina. O objetivo não foi "
            "cerimônia — foi tornar o sistema testável, substituível nas bordas e consistente "
            "entre apps.",
            TEAL_SOFT,
            TEAL,
            width,
            title="Propósito",
        )
    )
    story.append(PageBreak())


def section_title(story, s, text: str):
    story.append(Paragraph(text, s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))


def make_table(headers, rows, col_widths):
    data = [[Paragraph(h, ParagraphStyle("thx", fontName=FONT_B, fontSize=8.5, textColor=WHITE)) for h in headers]]
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            style = ParagraphStyle(
                "cell",
                fontName=FONT_B if i == 0 else FONT,
                fontSize=8.3,
                leading=11.2,
                textColor=TEAL_DARK if i == 0 else INK,
            )
            cells.append(Paragraph(cell, style))
        data.append(cells)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("BACKGROUND", (0, 1), (-1, -1), CARD),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD, WHITE]),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


def bullets(items, s):
    return ListFlowable(
        [
            ListItem(Paragraph(i, s["bullet"]), leftIndent=8, bulletColor=TEAL, value="•")
            for i in items
        ],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceAfter=8,
    )


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    s = styles()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.7 * cm,
        title="PDL PRO — Migração Clean Architecture + DI",
        author="PDL PRO",
        subject="Arquitetura técnica do backend",
    )
    width = A4[0] - 3.6 * cm
    story: list = []

    cover_page(story, s, width)

    # 1. Por que
    section_title(story, s, "1. Por que migrar")
    story.append(
        Paragraph(
            "Antes da migração, partes relevantes do backend misturavam transporte HTTP, "
            "regras de negócio e acesso a banco na mesma pilha. Views e serviços conheciam "
            "``.objects``, ``transaction.atomic`` e detalhes de modelos Django. Isso tornava "
            "difícil testar a regra sem subir o ORM, trocar um adaptador (ex.: gateway Lineage) "
            "sem arrastar a application, e manter o mesmo padrão entre wallet, shop, games e accounts.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Clean Architecture + injeção de dependência resolvem o problema pela <b>direção "
            "das dependências</b>: o domínio não conhece Django; a application só fala com "
            "portas; a infrastructure implementa essas portas; a presentation traduz HTTP. "
            "DI fecha o ciclo registrando adaptadores uma vez por app e resolvendo casos de uso "
            "por construtor tipado.",
            s["body"],
        )
    )
    why_rows = [
        ["Testabilidade", "Regras exercitadas com fakes nas portas, sem banco real."],
        ["Substituibilidade", "Trocar ORM/gateway/provedor sem reescrever casos de uso."],
        ["Consistência", "Mesmo desenho em todos os apps de negócio."],
        ["Segurança de borda", "Autorização, dinheiro e idempotência ficam na application/domain."],
        ["Manutenção", "Views finas; mudanças de contrato HTTP não espalham regra."],
    ]
    story.append(make_table(["Motivo", "Efeito prático"], why_rows, [4.2 * cm, width - 4.2 * cm]))
    story.append(Spacer(1, 8))

    # 2. Modelo alvo
    section_title(story, s, "2. Modelo alvo")
    story.append(
        Paragraph(
            "A regra de dependência adotada no repositório:",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>presentation → application → domain</b><br/>"
            "<b>infrastructure → domain</b> &nbsp;(implementa as portas)<br/>"
            "Application e presentation <b>não</b> importam infrastructure nem usam ORM.",
            s["body"],
        )
    )
    story.append(LayerBar(width))
    story.append(
        Paragraph(
            "Figura — camadas e responsabilidade. A seta de dependência aponta para dentro, "
            "em direção ao domínio.",
            s["caption"],
        )
    )
    layer_rows = [
        ["Domínio", "<font face='Courier'>domain/</font>", "Entidades, políticas, exceções e interfaces (portas)."],
        ["Aplicação", "<font face='Courier'>application/</font>", "Casos de uso, inputs tipados e orquestração."],
        ["Infraestrutura", "<font face='Courier'>infrastructure/</font>", "ORM, repositórios, gateways, providers DI."],
        ["Apresentação", "<font face='Courier'>presentation/</font>", "Views, serializers, URLs, cookies HTTP."],
    ]
    story.append(make_table(["Camada", "Pasta", "Responsabilidade"], layer_rows, [3.2 * cm, 3.6 * cm, width - 6.8 * cm]))
    story.append(Spacer(1, 6))
    story.append(
        ColoredBox(
            "common/ permanece transversal: container DI, UnitOfWork, contrato de erro, "
            "paginação, permissões e OpenAPI. Não deve absorver regra de negócio de um app.",
            AMBER_SOFT,
            AMBER,
            width,
            title="common/",
        )
    )
    story.append(PageBreak())

    # 3. DI
    section_title(story, s, "3. Injeção de dependência")
    story.append(
        Paragraph(
            "Cada app de negócio registra um <b>AppProvider</b> no <font face='Courier'>AppConfig.ready()</font>. "
            "O catálogo compõe o container raiz. O middleware cria um escopo por requisição; "
            "views <font face='Courier'>InjectedAPIView</font> resolvem o caso de uso com "
            "<font face='Courier'>self.resolve(...)</font>.",
            s["body"],
        )
    )
    life_rows = [
        ["SINGLETON", "Objetos imutáveis / pools no processo."],
        ["SCOPED", "Uma instância por requisição (repositórios, políticas)."],
        ["TRANSIENT", "Nova instância a cada resolve (casos de uso)."],
    ]
    story.append(make_table(["Lifetime", "Uso"], life_rows, [3.5 * cm, width - 3.5 * cm]))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "Comandos de management e tasks também passam pelo container "
            "(<font face='Courier'>DependencyInjection.root().create_scope()</font>), "
            "em vez de instanciar serviços concretos na mão.",
            s["body"],
        )
    )
    story.append(
        ColoredBox(
            "Service locator como fallback dentro de casos de uso foi eliminado. "
            "Dependências entram pelo construtor tipado — o container inspeciona e injeta. "
            "Isso evita acoplamento escondido e falhas só em runtime de produção.",
            TEAL_SOFT,
            TEAL,
            width,
            title="Decisão: sem locator na application",
        )
    )

    # 4. O que foi feito
    section_title(story, s, "4. O que foi migrado")
    story.append(
        Paragraph(
            "A migração foi feita em ondas, app por app, sempre com testes no mesmo conjunto "
            "de alterações. Resumo das frentes:",
            s["body"],
        )
    )
    mig_rows = [
        [
            "Wallet / games / paid services",
            "Crédito, débito e recompensas via <font face='Courier'>IWalletRepository</font>; settle e grant com portas.",
        ],
        [
            "Shop / payment",
            "Checkout, webhooks e listagens por use cases; gateways mockáveis na borda externa.",
        ],
        [
            "Accounts",
            "Auth, sessões, 2FA, OAuth, WebAuthn, e-mail e progresso via portas + DI.",
        ],
        [
            "Programs / support / themes",
            "Providers, use cases e views finas; staff consome portas dos apps donos.",
        ],
        [
            "Server / inventory / auction / marketplace",
            "Gateway Lineage e operações de personagem/itens atrás de portas.",
        ],
        [
            "Content",
            "Catálogo, Denkynho, wardrobe e FAQ com injeção; chat/assistant sem ORM direto.",
        ],
        [
            "Purity pass",
            "Sem ORM em application/presentation; sem cycle infra→presentation; seed via porta.",
        ],
    ]
    story.append(make_table(["Frente", "Resultado"], mig_rows, [4.4 * cm, width - 4.4 * cm]))
    story.append(PageBreak())

    # 5. Decisões-chave
    section_title(story, s, "5. Decisões-chave e por quê")
    story.append(Paragraph("<b>5.1 Portas em vez de models nas views</b>", s["h2"]))
    story.append(
        Paragraph(
            "Views deixaram de chamar <font face='Courier'>.objects</font> ou ModelSerializer "
            "preso a models de infraestrutura. Elas validam o transporte, resolvem o use case "
            "e serializam o resultado. Motivo: HTTP muda com frequência; a regra não deve "
            "acompanhar cada detalhe de serializer.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>5.2 UnitOfWork no lugar de atomic espalhado</b>", s["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier'>transaction.atomic</font> saiu da application. Transações "
            "ficam no adaptador / UnitOfWork, preservando rollback em fluxos de dinheiro, "
            "itens e recompensas sem vazar Django para a camada de orquestração.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>5.3 Staff consome portas dos apps donos</b>", s["h2"]))
    story.append(
        Paragraph(
            "Endpoints operacionais não reimplementam regra de wallet/games/server. "
            "Staff resolve portas admin já registradas pelos providers donos. Motivo: "
            "uma política, dois canais (customer vs staff), menos duplicação e menos drift.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>5.4 Cookies JWT: quem monta a Response</b>", s["h2"]))
    story.append(
        Paragraph(
            "Residual consciente fechado: a infrastructure não monta mais Response/DRF. "
            "<font face='Courier'>IAuthSessionService.require_user</font> materializa o usuário "
            "necessário a <font face='Courier'>RefreshToken.for_user</font>; "
            "<font face='Courier'>build_auth_response</font> e helpers de cookie ficam na "
            "presentation. Motivo: HTTP é transporte — não pode puxar a infra para cima.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>5.5 Seed de preview via porta</b>", s["h2"]))
    story.append(
        Paragraph(
            "O comando <font face='Courier'>seed_program_preview</font> só checa o ambiente "
            "preview e resolve <font face='Courier'>IPreviewSeedService</font>. O ORM vive em "
            "<font face='Courier'>DjangoPreviewSeedService</font>. Motivo: management commands "
            "são borda de infra, mas o padrão DI permanece; a regra de “quem usa ORM” fica "
            "explícita no adaptador.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>5.6 Relação ORM não vaza pela application</b>", s["h2"]))
    story.append(
        Paragraph(
            "Caminhos do tipo “andar relações Django” foram empurrados para repositórios "
            "(ex.: dumps tipados). A application recebe dados já materializados pelas portas. "
            "Motivo: lazy loading e queries escondidas destroem previsibilidade e testes.",
            s["body"],
        )
    )

    # 6. Antes / depois
    section_title(story, s, "6. Antes × depois")
    cmp_rows = [
        ["View com regra + ORM", "View fina → UseCase → Porta → Adapter"],
        ["Service locator opcional", "Construtor tipado obrigatório"],
        ["atomic na application", "UnitOfWork / adaptador"],
        ["AuthSession montava Response", "require_user + cookies na presentation"],
        ["Seed com ORM no comando", "Comando DI + adaptador ORM"],
        ["Duplicação staff × customer", "Portas compartilhadas nos apps donos"],
    ]
    story.append(make_table(["Antes", "Depois"], cmp_rows, [width / 2, width / 2]))
    story.append(PageBreak())

    # 7. Apps
    section_title(story, s, "7. Cobertura por módulo")
    apps_rows = [
        ["accounts", "Usuários, auth, 2FA, OAuth, WebAuthn, progresso"],
        ["server", "Status, personagens, rankings, ILineageGateway"],
        ["wallet", "Saldo, transferências, bônus"],
        ["shop", "Catálogo, carrinho, checkout"],
        ["payment", "Pedidos, provedores, webhooks"],
        ["inventory", "Depósito, retirada, troca"],
        ["marketplace / auction", "Anúncios, compra, leilões"],
        ["games", "Minigames, economia, battle pass, daily/fishing"],
        ["content", "Notícias, FAQ, Denkynho, wardrobe"],
        ["communication", "Notificações e push"],
        ["programs", "Apoiadores, roadmap, seed preview"],
        ["support / themes / staff", "Chamados, temas, operação"],
    ]
    story.append(make_table(["App", "Papel na arquitetura"], apps_rows, [4.2 * cm, width - 4.2 * cm]))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "Todos esses apps possuem <font face='Courier'>AppProvider</font> registrando "
            "portas, adaptadores e casos de uso com lifetimes adequados.",
            s["body"],
        )
    )

    # 8. Fluxo de implementação
    section_title(story, s, "8. Como implementar uma feature daqui pra frente")
    story.append(
        bullets(
            [
                "Modele entidade, exceção ou interface no <b>domínio</b>.",
                "Crie o caso de uso com input tipado na <b>application</b>.",
                "Implemente repositório/gateway na <b>infrastructure</b>.",
                "Registre interface + implementação + use case no <b>provider</b>.",
                "Exponha serializer/view fina e rota no namespace certo.",
                "No frontend, concentre HTTP em services de domínio + <font face='Courier'>http.ts</font>.",
                "Cubra sucesso, inválidos, authz, limites e idempotência com testes.",
                "Atualize OpenAPI/docs quando o contrato público mudar.",
            ],
            s,
        )
    )
    story.append(
        ColoredBox(
            "Namespaces: auth · public · shared · customer · staff · system. "
            "Escolha o namespace pelo ator e pelo risco — não pela conveniência de URL.",
            AMBER_SOFT,
            AMBER,
            width,
            title="Contrato de API",
        )
    )

    # 9. Validação
    section_title(story, s, "9. Validação e estado atual")
    story.append(
        Paragraph(
            "A suíte de backend sob <font face='Courier'>apps/</font> fechou em "
            "<b>758 testes passando</b> após o fechamento dos residuais. Critérios de auditoria "
            "confirmados na varredura final:",
            s["body"],
        )
    )
    story.append(
        bullets(
            [
                "Domínio sem imports Django/DRF/infra.",
                "Application sem <font face='Courier'>.objects</font>, sem atomic, sem import de infrastructure.",
                "Presentation sem ORM; middleware de catálogo ativo vive em infrastructure.",
                "Management commands sem ORM direto (seed via porta).",
                "Sem dependência <b>infrastructure → presentation</b>.",
            ],
            s,
        )
    )
    story.append(
        ColoredBox(
            "Atritos de borda aceitos (não reabrem o escopo): parsing JWT com simplejwt "
            "em sessions da application; usuário ORM no limite "
            "<font face='Courier'>RefreshToken.for_user</font>; helpers de nome de cookie "
            "nas camadas de transporte. São fricções conscientes de biblioteca/HTTP, "
            "não regressão de Clean Architecture.",
            TEAL_SOFT,
            TEAL,
            width,
            title="100% do escopo migrado",
        )
    )
    story.append(Spacer(1, 10))

    # 10. Encerramento
    section_title(story, s, "10. Conclusão")
    story.append(
        Paragraph(
            "A migração transformou o backend do PDL PRO de um conjunto de fluxos "
            "Django-cêntricos em um sistema modular com regra de dependência explícita. "
            "O ganho imediato é previsibilidade: cada feature nova tem um caminho óbvio "
            "(porta → use case → adapter → view). O ganho estrutural é longevidade: "
            "testes, troca de integrações e revisão de segurança passam a operar em bordas "
            "estáveis.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Documentação viva: <font face='Courier'>docs/arquitetura/visao-geral.md</font>, "
            "<font face='Courier'>apps.md</font>, <font face='Courier'>common.md</font> e "
            "<font face='Courier'>reutilizacao.md</font>. Este PDF é o registro narrativo da "
            "migração concluída em setembro de 2026.",
            s["body"],
        )
    )
    story.append(Spacer(1, 16))
    end = Table(
        [
            [
                Paragraph(
                    "<b>PDL PRO</b> — arquitetura em camadas com DI<br/>"
                    "<font color='#C96A2B'>Migrado · Validado · Pronto para novas features</font>",
                    ParagraphStyle(
                        "end",
                        fontName=FONT,
                        fontSize=10,
                        leading=14,
                        alignment=TA_CENTER,
                        textColor=WHITE,
                    ),
                )
            ]
        ],
        colWidths=[width],
    )
    end.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TEAL_DARK),
                ("TOPPADDING", (0, 0), (-1, -1), 16),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
                ("BOX", (0, 0), (-1, -1), 0, TEAL_DARK),
            ]
        )
    )
    story.append(end)

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    build()
