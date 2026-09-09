"""Gera o PDF da migração frontend em camadas (SPA) do PDL PRO."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "arquitetura" / "migracao-frontend-camadas.pdf"

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


def _register_fonts() -> tuple[str, str]:
    for regular, bold, name, bold_name in [
        (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\segoeuib.ttf", "SegoeUI", "SegoeUI-Bold"),
        (r"C:\Windows\Fonts\calibri.ttf", r"C:\Windows\Fonts\calibrib.ttf", "Calibri", "Calibri-Bold"),
    ]:
        if Path(regular).exists() and Path(bold).exists():
            pdfmetrics.registerFont(TTFont(name, regular))
            pdfmetrics.registerFont(TTFont(bold_name, bold))
            return name, bold_name
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_B = _register_fonts()


class ColoredBox(Flowable):
    def __init__(self, text: str, fill, border, width: float, title: str | None = None):
        super().__init__()
        self.text, self.fill, self.border, self.box_width, self.title = text, fill, border, width, title
        self._h = 0
        self._flow: list = []

    def wrap(self, availWidth, availHeight):
        w = min(self.box_width, availWidth)
        parts = []
        if self.title:
            parts.append(
                Paragraph(
                    f"<b>{self.title}</b>",
                    ParagraphStyle("bt", fontName=FONT_B, fontSize=10, leading=13, textColor=TEAL_DARK),
                )
            )
            parts.append(Spacer(1, 4))
        parts.append(
            Paragraph(
                self.text,
                ParagraphStyle(
                    "bb", fontName=FONT, fontSize=9.2, leading=13, textColor=INK, alignment=TA_JUSTIFY
                ),
            )
        )
        self._flow = parts
        h = 14
        for p in parts:
            _, ph = p.wrap(w - 18, availHeight)
            h += ph + 2
        self._h, self.width = h, w
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


def styles():
    return {
        "h1": ParagraphStyle(
            "h1", fontName=FONT_B, fontSize=16, leading=20, textColor=TEAL_DARK, spaceAfter=10
        ),
        "h2": ParagraphStyle(
            "h2", fontName=FONT_B, fontSize=12, leading=16, textColor=TEAL, spaceBefore=10, spaceAfter=6
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
        "bullet": ParagraphStyle("bullet", fontName=FONT, fontSize=9.4, leading=13.5, textColor=INK),
        "cover_title": ParagraphStyle(
            "ct", fontName=FONT_B, fontSize=24, leading=30, textColor=WHITE, alignment=TA_CENTER
        ),
        "cover_sub": ParagraphStyle(
            "cs",
            fontName=FONT,
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#D7ECEC"),
            alignment=TA_CENTER,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.line(1.8 * cm, A4[1] - 1.3 * cm, A4[0] - 1.8 * cm, A4[1] - 1.3 * cm)
        canvas.setFont(FONT, 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(1.8 * cm, A4[1] - 1.1 * cm, "PDL PRO · Frontend em camadas")
        canvas.drawRightString(A4[0] - 1.8 * cm, A4[1] - 1.1 * cm, "Paridade SPA")
        canvas.line(1.8 * cm, 1.2 * cm, A4[0] - 1.8 * cm, 1.2 * cm)
        canvas.drawCentredString(A4[0] / 2, 0.75 * cm, str(doc.page))
    canvas.restoreState()


def make_table(headers, rows, col_widths):
    data = [
        [
            Paragraph(h, ParagraphStyle("th", fontName=FONT_B, fontSize=8.5, textColor=WHITE))
            for h in headers
        ]
    ]
    for row in rows:
        data.append(
            [
                Paragraph(
                    cell,
                    ParagraphStyle(
                        "td",
                        fontName=FONT_B if i == 0 else FONT,
                        fontSize=8.3,
                        leading=11.2,
                        textColor=TEAL_DARK if i == 0 else INK,
                    ),
                )
                for i, cell in enumerate(row)
            ]
        )
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD, WHITE]),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
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
    s = styles()
    width = A4[0] - 3.6 * cm
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.7 * cm,
        title="PDL PRO — Migração frontend em camadas",
        author="PDL PRO",
    )
    story: list = []

    story.append(Spacer(1, 2 * cm))
    cover = Table(
        [
            [
                Paragraph(
                    "Migração frontend<br/>em camadas (SPA)",
                    s["cover_title"],
                )
            ],
            [Spacer(1, 10)],
            [
                Paragraph(
                    "Paridade arquitetural com o backend no critério do client:<br/>"
                    "barrel único, serviços por capacidade, páginas finas e invalidação escopada.",
                    s["cover_sub"],
                )
            ],
            [Spacer(1, 16)],
            [
                Paragraph(
                    "<font color='#F3C39A'>React · Vite · TanStack Query · services/api · sem DI container</font>",
                    ParagraphStyle("m", fontName=FONT, fontSize=9, alignment=TA_CENTER, textColor=AMBER),
                )
            ],
            [Spacer(1, 8)],
            [
                Paragraph(
                    "Setembro 2026",
                    ParagraphStyle("m2", fontName=FONT_B, fontSize=10, alignment=TA_CENTER, textColor=WHITE),
                )
            ],
        ],
        colWidths=[width],
    )
    cover.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TEAL_DARK),
                ("TOPPADDING", (0, 0), (-1, 0), 28),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 28),
                ("LEFTPADDING", (0, 0), (-1, -1), 22),
                ("RIGHTPADDING", (0, 0), (-1, -1), 22),
            ]
        )
    )
    story.append(cover)
    story.append(Spacer(1, 1 * cm))
    story.append(
        ColoredBox(
            "O transporte HTTP do SPA já estava centralizado. Esta migração fechou a "
            "paridade de organização: fachada de API, split de serviços misturados, "
            "extração de páginas gordas e fim da invalidação global de cache.",
            TEAL_SOFT,
            TEAL,
            width,
            title="Critério de 100% (frontend)",
        )
    )
    story.append(PageBreak())

    story.append(Paragraph("1. Por que não é o mesmo stack do backend", s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))
    story.append(
        Paragraph(
            "No Django migrámos regra de negócio para domínio/application com DI. No React, "
            "<b>a regra continua no backend</b>. O SPA adapta contratos HTTP e orquestra UI. "
            "Portar lifetimes SCOPED/TRANSIENT ou um container Inversify atritaria o modelo "
            "do TanStack Query sem ganho. Composition root = AppProviders + objetos *Api.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<font face='Courier'>pages/components → services/api.ts → domain/*Api → infra/http.ts</font><br/>"
            "<font face='Courier'>lib/</font> = helpers puros · "
            "<font face='Courier'>hooks/</font> = ciclo de UI sem paths de API",
            s["body"],
        )
    )

    story.append(Paragraph("2. O que mudou", s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))
    story.append(
        make_table(
            ["Frente", "Resultado"],
            [
                [
                    "Barrel api.ts",
                    "Exporta programs, commerce, catalog, staffGameContent, financialReports, customItems, itemObservation.",
                ],
                [
                    "sendJson",
                    "Helper compartilhado; commerce não importa programs.",
                ],
                [
                    "Catálogo",
                    "HTTP em catalogApi; index/search em lib/; hook useItemCatalog.",
                ],
                [
                    "Split programs",
                    "programsApi = produto; gamesApi = gameplay + details; staffGameContentApi = CRUD staff.",
                ],
                [
                    "Páginas finas",
                    "Inventory, Rankings, Wallet, Rewards, Auction, Marketplace, Help, admins.",
                ],
                [
                    "Invalidação",
                    "useProgramAction exige queryKeys; sem invalidateQueries() global.",
                ],
            ],
            [3.8 * cm, width - 3.8 * cm],
        )
    )
    story.append(Spacer(1, 10))

    story.append(Paragraph("3. Decisões e por quê", s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))
    story.append(Paragraph("<b>Casa única para games</b>", s["h2"]))
    story.append(
        Paragraph(
            "Battle pass/daily/fishing details saíram de programsApi. Um só lugar evita drift "
            "entre RewardsPage, FishingGame e GamesPage.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>Sem DI container</b>", s["h2"]))
    story.append(
        Paragraph(
            "Providers React + imports explícitos cobrem testes (vi.mock do módulo domain "
            "ainda intercepta re-exports). Um container adicionaria cerimônia sem fronteira nova.",
            s["body"],
        )
    )
    story.append(Paragraph("<b>Invalidação escopada</b>", s["h2"]))
    story.append(
        Paragraph(
            "invalidateQueries() sem filtro revalidava o cache inteiro após cada ação de "
            "programa. Agora cada run declara as chaves (ex.: fishing + fishing-details).",
            s["body"],
        )
    )
    story.append(PageBreak())

    story.append(Paragraph("4. Como implementar daqui pra frente", s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))
    story.append(
        bullets(
            [
                "Tipos sem coerção monetária imprecisa.",
                "Operação no domain *Api + export em services/api.ts.",
                "Página importa de services/api; Query + invalidação escopada.",
                "UI em components/&lt;feature&gt;/; página só orquestra.",
                "Testes de contrato HTTP + interação Testing Library.",
            ],
            s,
        )
    )
    story.append(
        ColoredBox(
            "Auditoria: fetch só em http.ts; páginas sem import de domain/infra; "
            "nenhum invalidateQueries() sem queryKey; lib/ sem request.",
            AMBER_SOFT,
            AMBER,
            width,
            title="Checklist de auditoria",
        )
    )
    story.append(Spacer(1, 12))
    story.append(Paragraph("5. Conclusão", s["h1"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=10))
    story.append(
        Paragraph(
            "Com o backend em Clean Architecture + DI e o frontend em camadas SPA "
            "consistentes, o caminho de feature fica simétrico: porta/use case no servidor, "
            "*Api + página fina no client. Documentação viva em docs/arquitetura/visao-geral.md "
            "e docs/desenvolvimento/frontend.md.",
            s["body"],
        )
    )
    end = Table(
        [
            [
                Paragraph(
                    "<b>PDL PRO</b> — frontend em camadas<br/>"
                    "<font color='#C96A2B'>Migrado · Validado · Pronto para novas telas</font>",
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
            ]
        )
    )
    story.append(Spacer(1, 16))
    story.append(end)

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    build()
