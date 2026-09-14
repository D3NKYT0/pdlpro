"""Force-correct wrong msgstr left by msgmerge fuzzy matches and strip #| refs.

Usage (from backend/):
  .\\.venv\\Scripts\\python.exe scripts\\fix_po_fuzzy.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# msgid PT -> (en, es) — must overwrite wrong fuzzy msgstr
FIXES: dict[str, tuple[str, str]] = {
    "Jogador": ("Player", "Jugador"),
    "Administrador": ("Administrator", "Administrador"),
    "Refresh token ausente.": (
        "Refresh token missing.",
        "Falta el refresh token.",
    ),
    "Ação 2FA inválida.": ("Invalid 2FA action.", "Acción 2FA no válida."),
    "Não foi possível autenticar com esta chave.": (
        "Could not authenticate with this key.",
        "No se pudo autenticar con esta clave.",
    ),
    "Finalizado": ("Finished", "Finalizado"),
    "Contas e personagens": ("Accounts and characters", "Cuentas y personajes"),
    "Carteira e inventário": ("Wallet and inventory", "Cartera e inventario"),
    "Jogos e recompensas": ("Games and rewards", "Juegos y recompensas"),
    "Ajuda e atendimento": ("Help and support", "Ayuda y atención"),
    "Superadministradores": ("Superusers", "Superadministradores"),
    "Alimentar": ("Feed", "Alimentar"),
    "Dar carinho": ("Pet", "Dar cariño"),
    "Temporada": ("Season", "Temporada"),
    "Missão do passe": ("Pass mission", "Misión del pase"),
    "Missões do passe": ("Pass missions", "Misiones del pase"),
    "Resgate de missão do passe": ("Pass mission claim", "Canje de misión del pase"),
    "Resgates de missão do passe": (
        "Pass mission claims",
        "Canjes de misión del pase",
    ),
    "Troca do passe": ("Pass exchange", "Intercambio del pase"),
    "Trocas do passe": ("Pass exchanges", "Intercambios del pase"),
    "Marco do passe": ("Pass milestone", "Hito del pase"),
    "Marcos do passe": ("Pass milestones", "Hitos del pase"),
    "Temporada de bônus diário": ("Daily bonus season", "Temporada de bono diario"),
    "Temporadas de bônus diário": (
        "Daily bonus seasons",
        "Temporadas de bono diario",
    ),
    "Dia de bônus diário": ("Daily bonus day", "Día de bono diario"),
    "Dias de bônus diário": ("Daily bonus days", "Días de bono diario"),
    "Entrada do pool de bônus": ("Bonus pool entry", "Entrada del pool de bonos"),
    "Entradas do pool de bônus": (
        "Bonus pool entries",
        "Entradas del pool de bonos",
    ),
    "Isca de pesca": ("Fishing bait", "Cebo de pesca"),
    "Iscas de pesca": ("Fishing baits", "Cebos de pesca"),
    "Isca do jogador": ("Player bait", "Cebo del jugador"),
    "Iscas do jogador": ("Player baits", "Cebos del jugador"),
    "Configuração desconhecida.": (
        "Unknown configuration.",
        "Configuración desconocida.",
    ),
    "Assinatura inválida.": ("Invalid signature.", "Firma no válida."),
    "Metadados JSON inválidos.": (
        "Invalid JSON metadata.",
        "Metadatos JSON no válidos.",
    ),
    "Metadados públicos": ("Public metadata", "Metadatos públicos"),
    "Item customizado": ("Custom item", "Ítem personalizado"),
    "Itens customizados": ("Custom items", "Ítems personalizados"),
    "Descrição": ("Description", "Descripción"),
    "Categoria de observação": ("Observation category", "Categoría de observación"),
    "Categorias de observação": (
        "Observation categories",
        "Categorías de observación",
    ),
    "Criado por": ("Created by", "Creado por"),
    "Quantidade L2": ("L2 quantity", "Cantidad L2"),
    "Detalhes de observação": ("Observation details", "Detalles de observación"),
    "Favorito de observação": ("Observation favorite", "Favorito de observación"),
    "Favoritos de observação": (
        "Observation favorites",
        "Favoritos de observación",
    ),
    "Operação de serviço": ("Service operation", "Operación de servicio"),
    "Operações de serviço": ("Service operations", "Operaciones de servicio"),
    "O máximo deve ser maior ou igual ao mínimo.": (
        "The maximum must be greater than or equal to the minimum.",
        "El máximo debe ser mayor o igual que el mínimo.",
    ),
    "Imagem inválida.": ("Invalid image.", "Imagen no válida."),
    "Você não tem permissão para esta ação.": (
        "You do not have permission for this action.",
        "No tienes permiso para esta acción.",
    ),
    "ID de item inválido.": ("Invalid item ID.", "ID de ítem no válido."),
    "Autenticação necessária.": (
        "Authentication required.",
        "Autenticación necesaria.",
    ),
    "Formato de conteúdo não suportado.": (
        "Unsupported content type.",
        "Formato de contenido no compatible.",
    ),
    "Serviço temporariamente indisponível.": (
        "Service temporarily unavailable.",
        "Servicio temporalmente no disponible.",
    ),
    "recurso não encontrado": ("resource not found", "recurso no encontrado"),
    # remaining empties / domain gaps
    "Não foi possível consultar os itens. Confira a conexão L2 e o módulo SQL.": (
        "Could not query items. Check the L2 connection and SQL module.",
        "No se pudieron consultar los ítems. Revisa la conexión L2 y el módulo SQL.",
    ),
    "Personagem não encontrado nesta conta.": (
        "Character not found on this account.",
        "Personaje no encontrado en esta cuenta.",
    ),
    "Transferência de moedas indisponível neste servidor.": (
        "Coin transfer unavailable on this server.",
        "Transferencia de monedas no disponible en este servidor.",
    ),
    "Observação de itens indisponível neste gateway.": (
        "Item observation unavailable on this gateway.",
        "Observación de ítems no disponible en este gateway.",
    ),
    "Carteira não encontrada.": ("Wallet not found.", "Cartera no encontrada."),
    "Saldo insuficiente.": ("Insufficient balance.", "Saldo insuficiente."),
    "Transferência inválida.": ("Invalid transfer.", "Transferencia no válida."),
    "Saldo insuficiente. Bônus não pode ser enviado ao jogo.": (
        "Insufficient balance. Bonus cannot be sent to the game.",
        "Saldo insuficiente. El bono no puede enviarse al juego.",
    ),
    "Informe um código válido do autenticador.": (
        "Enter a valid authenticator code.",
        "Introduce un código válido del autenticador.",
    ),
    "Código do autenticador": (
        "Authenticator code",
        "Código del autenticador",
    ),
    '{"chave": "valor"}': ('{"key": "value"}', '{"clave": "valor"}'),
    "Exemplo: [57, 4037]. Em sobreposições, vale a primeira categoria na ordem.": (
        "Example: [57, 4037]. On overlaps, the first category in order wins.",
        "Ejemplo: [57, 4037]. En solapamientos, vale la primera categoría en el orden.",
    ),
    # admin, LGPD, termos e catálogo de itens/iscas
    "O segredo TOTP não é exibido nem editável. Desmarcar a autenticação em dois fatores apaga o segredo e o usuário precisa cadastrá-la novamente.": (
        (
            "The TOTP secret is neither shown nor editable. Clearing two-factor authentication "
            "deletes the secret and the user must set it up again."
        ),
        (
            "El secreto TOTP no se muestra ni se puede editar. Desmarcar la autenticación en dos "
            "pasos borra el secreto y el usuario debe configurarla de nuevo."
        ),
    ),
    "IP do aceite": ("Acceptance IP", "IP de la aceptación"),
    "User-agent do aceite": ("Acceptance user agent", "User agent de la aceptación"),
    "Log de exportação de dados (LGPD)": (
        "Data export log (LGPD)",
        "Registro de exportación de datos (LGPD)",
    ),
    "Logs de exportação de dados (LGPD)": (
        "Data export logs (LGPD)",
        "Registros de exportación de datos (LGPD)",
    ),
    "Exclusão de conta (LGPD)": ("Account deletion (LGPD)", "Eliminación de cuenta (LGPD)"),
    "Código de ação da conta": ("Account action code", "Código de acción de la cuenta"),
    "Códigos de ação da conta": ("Account action codes", "Códigos de acción de la cuenta"),
    "Aceitar documentos legais": ("Accept legal documents", "Aceptar documentos legales"),
    "Registra o aceite explícito da versão vigente dos Termos, Privacidade e Acordo.": (
        "Records the explicit acceptance of the current version of the Terms, Privacy and Agreement.",
        "Registra la aceptación explícita de la versión vigente de los Términos, la Privacidad y el Acuerdo.",
    ),
    "Item": ("Item", "Ítem"),
    "Personagem": ("Character", "Personaje"),
    "Cria um leilão de item do inventário (kind=item) ou de personagem L2 (kind=character).": (
        "Creates an auction for an inventory item (kind=item) or an L2 character (kind=character).",
        "Crea una subasta de un ítem del inventario (kind=item) o de un personaje L2 (kind=character).",
    ),
    "Histórico de versões legais": ("Legal version history", "Historial de versiones legales"),
    "Lista o histórico público de versões dos documentos legais.": (
        "Lists the public version history of the legal documents.",
        "Lista el historial público de versiones de los documentos legales.",
    ),
    "Iscas comuns": ("Common baits", "Cebos comunes"),
    "Fichas compram isca comum; iscas comuns compram as encantadas.": (
        "Tokens buy common bait; common baits buy the enchanted ones.",
        "Las fichas compran cebo común; los cebos comunes compran los encantados.",
    ),
    "Custo em iscas comuns quando a isca é encantada.": (
        "Cost in common baits when the bait is enchanted.",
        "Coste en cebos comunes cuando el cebo es encantado.",
    ),
    "Troca fichas por pacotes de iscas para o jogador autenticado.": (
        "Exchanges tokens for bait packs for the authenticated player.",
        "Cambia fichas por paquetes de cebos para el jugador autenticado.",
    ),
    "Lança a linha de pesca consumindo iscas e devolve o resultado da captura.": (
        "Casts the fishing line consuming baits and returns the catch result.",
        "Lanza el sedal consumiendo cebos y devuelve el resultado de la captura.",
    ),
    "Recusado para o jogador. Simulações são confirmadas pela equipe em POST /api/v1/staff/payments/{id}/confirm-mock/.": (
        (
            "Refused for the player. Simulations are confirmed by the team at "
            "POST /api/v1/staff/payments/{id}/confirm-mock/."
        ),
        (
            "Rechazado para el jugador. Las simulaciones las confirma el equipo en "
            "POST /api/v1/staff/payments/{id}/confirm-mock/."
        ),
    ),
    "Confirmar pagamento simulado": ("Confirm simulated payment", "Confirmar pago simulado"),
    "Credita a carteira de um pedido mock pendente. Não confirma Mercado Pago nem Stripe. Use somente em desenvolvimento ou para regularizar uma simulação consciente.": (
        (
            "Credits the wallet of a pending mock order. It does not confirm Mercado Pago or "
            "Stripe. Use it only in development or to settle a deliberate simulation."
        ),
        (
            "Acredita la cartera de un pedido mock pendiente. No confirma Mercado Pago ni "
            "Stripe. Úsalo solo en desarrollo o para regularizar una simulación consciente."
        ),
    ),
    "A senha precisa ter ao menos 8 caracteres.": (
        "The password must have at least 8 characters.",
        "La contraseña debe tener al menos 8 caracteres.",
    ),
    "Extensão de exemplo": ("Sample extension", "Extensión de ejemplo"),
}


_MSGID = re.compile(r'^msgid ((?:".*"\n?)+)', re.MULTILINE)
_MSGSTR = re.compile(r'^msgstr ((?:".*"\n?)+)', re.MULTILINE)


def _joined(value: str) -> str:
    """Concatena as partes de um literal PO (``"a"\\n"b"``) em uma única string."""

    return "".join(re.findall(r'"(.*)"', value))


def apply(path: Path, lang_index: int) -> tuple[int, int]:
    """Reescreve msgstr do catálogo com os valores de FIXES e remove marcas fuzzy.

    Percorre bloco a bloco para alcançar também msgids longos, que o gettext quebra em várias
    linhas. Retorna quantas entradas foram corrigidas e quantas referências ``#|`` saíram.
    """

    blocks = path.read_text(encoding="utf-8").split("\n\n")
    updated = 0
    stripped = 0
    result: list[str] = []

    for block in blocks:
        msgid = _MSGID.search(block)
        msgstr = _MSGSTR.search(block)
        if msgid and msgstr:
            key = _joined(msgid.group(1))
            target = FIXES.get(key)
            if target and _joined(msgstr.group(1)) != target[lang_index]:
                escaped = target[lang_index].replace("\\", "\\\\").replace('"', '\\"')
                block = block[: msgstr.start()] + f'msgstr "{escaped}"\n' + block[msgstr.end() :]
                updated += 1
        stripped += len(re.findall(r'^#\| .*\n', block, flags=re.MULTILINE))
        block = re.sub(r"^#\| .*\n", "", block, flags=re.MULTILINE)
        block = re.sub(r"^#, fuzzy\n", "", block, flags=re.MULTILINE)
        result.append(block)

    path.write_text("\n\n".join(result), encoding="utf-8")
    return updated, stripped


def main() -> None:
    en_u, en_s = apply(ROOT / "locale/en/LC_MESSAGES/django.po", 0)
    es_u, es_s = apply(ROOT / "locale/es/LC_MESSAGES/django.po", 1)
    print(f"updated en={en_u} (stripped #|={en_s}) es={es_u} (stripped #|={es_s})")


if __name__ == "__main__":
    main()
