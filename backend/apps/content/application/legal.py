from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError

DOCUMENTS = {
    "terms": {
        "title": "Termos de uso",
        "body": (
            "Ao criar uma conta no PDL PRO você concorda em usar o painel de forma lícita, "
            "respeitar as regras do servidor Lineage 2 e não explorar falhas, automações não autorizadas "
            "ou comércio irregular de itens e contas. A equipe pode suspender contas que violem estas regras. "
            "Moedas, fichas e benefícios digitais não são dinheiro real e podem ser ajustados para manter o equilíbrio do jogo."
        ),
    },
    "privacy": {
        "title": "Política de privacidade",
        "body": (
            "Coletamos e-mail, nome de usuário e dados necessários para login, pagamentos e vínculo da conta Lineage. "
            "Cookies HttpOnly guardam a sessão. Notificações push só são enviadas se você autorizar o navegador. "
            "Não vendemos seus dados. Você pode pedir exclusão da conta pelo suporte. "
            "Pagamentos são processados por Stripe ou Mercado Pago conforme o método escolhido."
        ),
    },
    "agreement": {
        "title": "Acordo do usuário",
        "body": (
            "O PDL PRO é um painel complementar ao servidor de jogo. O acesso ao Lineage 2, itens e personagens "
            "depende do banco do jogo e das regras da administração. Serviços digitais (loja, jogos, carteira) "
            "podem mudar sem aviso prévio. Este acordo complementa os termos de uso e a política de privacidade."
        ),
    },
}


@dataclass(frozen=True, slots=True)
class LegalDocument:
    slug: str
    title: str
    body: str
    version: str


class ListLegalDocumentsUseCase(UseCase[None, dict]):
    def execute(self, data: None = None) -> dict:
        version = getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31")
        return {
            "version": version,
            "documents": [
                {"slug": slug, "title": item["title"]}
                for slug, item in DOCUMENTS.items()
            ],
        }


class GetLegalDocumentUseCase(UseCase[str, LegalDocument]):
    def execute(self, data: str) -> LegalDocument:
        slug = (data or "").strip().lower()
        item = DOCUMENTS.get(slug)
        if item is None:
            raise EntityNotFoundError("Documento legal não encontrado.")
        return LegalDocument(
            slug=slug,
            title=item["title"],
            body=item["body"],
            version=getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31"),
        )
