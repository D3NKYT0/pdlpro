from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError
from common.i18n import resolve_language

DOCUMENTS = {
    "terms": {
        "pt": {
            "title": "Termos de uso",
            "body": (
                "Ao criar uma conta no PDL PRO você concorda em usar o painel de forma lícita, "
                "respeitar as regras do servidor Lineage 2 e não explorar falhas, automações não autorizadas "
                "ou comércio irregular de itens e contas. A equipe pode suspender contas que violem estas regras. "
                "Moedas, fichas e benefícios digitais não são dinheiro real e podem ser ajustados para manter o equilíbrio do jogo."
            ),
        },
        "en": {
            "title": "Terms of use",
            "body": (
                "By creating a PDL PRO account you agree to use the panel lawfully, "
                "respect the Lineage 2 server rules, and not exploit bugs, unauthorized automation, "
                "or irregular trading of items and accounts. Staff may suspend accounts that break these rules. "
                "Coins, tokens, and digital benefits are not real money and may be adjusted to keep the game balanced."
            ),
        },
        "es": {
            "title": "Términos de uso",
            "body": (
                "Al crear una cuenta en PDL PRO aceptas usar el panel de forma lícita, "
                "respetar las reglas del servidor Lineage 2 y no explotar fallos, automatizaciones no autorizadas "
                "ni el comercio irregular de objetos y cuentas. El equipo puede suspender cuentas que incumplan estas reglas. "
                "Las monedas, fichas y beneficios digitales no son dinero real y pueden ajustarse para mantener el equilibrio del juego."
            ),
        },
    },
    "privacy": {
        "pt": {
            "title": "Política de privacidade",
            "body": (
                "Coletamos e-mail, nome de usuário e dados necessários para login, pagamentos e vínculo da conta Lineage. "
                "Cookies HttpOnly guardam a sessão. Notificações push só são enviadas se você autorizar o navegador. "
                "Não vendemos seus dados. Você pode pedir exclusão da conta pelo suporte. "
                "Pagamentos são processados por Stripe ou Mercado Pago conforme o método escolhido."
            ),
        },
        "en": {
            "title": "Privacy policy",
            "body": (
                "We collect email, username, and data needed for login, payments, and Lineage account linking. "
                "HttpOnly cookies store the session. Push notifications are sent only if you allow them in the browser. "
                "We do not sell your data. You may request account deletion through support. "
                "Payments are processed by Stripe or Mercado Pago according to the method you choose."
            ),
        },
        "es": {
            "title": "Política de privacidad",
            "body": (
                "Recopilamos correo electrónico, nombre de usuario y datos necesarios para el inicio de sesión, pagos y vínculo de la cuenta Lineage. "
                "Las cookies HttpOnly guardan la sesión. Las notificaciones push solo se envían si autorizas el navegador. "
                "No vendemos tus datos. Puedes pedir la eliminación de la cuenta a través del soporte. "
                "Los pagos se procesan con Stripe o Mercado Pago según el método elegido."
            ),
        },
    },
    "agreement": {
        "pt": {
            "title": "Acordo do usuário",
            "body": (
                "O PDL PRO é um painel complementar ao servidor de jogo. O acesso ao Lineage 2, itens e personagens "
                "depende do banco do jogo e das regras da administração. Serviços digitais (loja, jogos, carteira) "
                "podem mudar sem aviso prévio. Este acordo complementa os termos de uso e a política de privacidade."
            ),
        },
        "en": {
            "title": "User agreement",
            "body": (
                "PDL PRO is a complementary panel for the game server. Access to Lineage 2, items, and characters "
                "depends on the game database and administration rules. Digital services (shop, games, wallet) "
                "may change without prior notice. This agreement complements the terms of use and privacy policy."
            ),
        },
        "es": {
            "title": "Acuerdo del usuario",
            "body": (
                "PDL PRO es un panel complementario al servidor de juego. El acceso a Lineage 2, objetos y personajes "
                "depende de la base de datos del juego y de las reglas de la administración. Los servicios digitales (tienda, juegos, cartera) "
                "pueden cambiar sin previo aviso. Este acuerdo complementa los términos de uso y la política de privacidad."
            ),
        },
    },
}


def _document_copy(item: dict, language: str) -> dict:
    language = resolve_language(language)
    localized = item.get(language) or item.get("pt") or {}
    return {"title": localized["title"], "body": localized["body"]}


@dataclass(frozen=True, slots=True)
class LegalDocument:
    """Documento legal identificado por slug, com título, conteúdo e versão de aceite.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    slug: str
    title: str
    body: str
    version: str
    language: str = "pt"


@dataclass(frozen=True, slots=True)
class ListLegalDocumentsInput:
    """Idioma opcional para listar títulos dos documentos legais."""

    language: str = "pt"


@dataclass(frozen=True, slots=True)
class GetLegalDocumentInput:
    """Slug e idioma do documento legal solicitado."""

    slug: str
    language: str = "pt"


class ListLegalDocumentsUseCase(UseCase[ListLegalDocumentsInput | None, dict]):
    """Lista slugs e títulos dos documentos legais junto da versão configurada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListLegalDocumentsInput`` ou ``None``.
    O retorno é ``dict``.
    """

    def execute(self, data: ListLegalDocumentsInput | None = None) -> dict:
        language = resolve_language(data.language if data else "pt")
        version = getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31")
        return {
            "version": version,
            "language": language,
            "documents": [
                {"slug": slug, "title": _document_copy(item, language)["title"]}
                for slug, item in DOCUMENTS.items()
            ],
        }


class GetLegalDocumentUseCase(UseCase[GetLegalDocumentInput | str, LegalDocument]):
    """Obtém o documento legal pelo slug normalizado, incluindo conteúdo e versão.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetLegalDocumentInput`` ou ``str``.
    O retorno é ``LegalDocument``.
    """

    def execute(self, data: GetLegalDocumentInput | str) -> LegalDocument:
        if isinstance(data, str):
            slug = data
            language = "pt"
        else:
            slug = data.slug
            language = data.language
        slug = (slug or "").strip().lower()
        language = resolve_language(language)
        item = DOCUMENTS.get(slug)
        if item is None:
            raise EntityNotFoundError("Documento legal não encontrado.")
        copy = _document_copy(item, language)
        return LegalDocument(
            slug=slug,
            title=copy["title"],
            body=copy["body"],
            version=getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31"),
            language=language,
        )
