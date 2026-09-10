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
}


_SINGLE = re.compile(
    r'^msgid "(?P<id>[^"]+)"\nmsgstr "(?P<str>[^"]*)"$',
    re.MULTILINE,
)
_MULTILINE_EMPTY = re.compile(
    r'^msgid ""\n"(?P<id>[^"]+)"\nmsgstr ""$',
    re.MULTILINE,
)


def apply(path: Path, lang_index: int) -> tuple[int, int]:
    text = path.read_text(encoding="utf-8")
    updated = 0

    def repl_single(match: re.Match[str]) -> str:
        nonlocal updated
        msgid = match.group("id")
        current = match.group("str")
        if msgid not in FIXES:
            return match.group(0)
        target = FIXES[msgid][lang_index]
        if current == target:
            return match.group(0)
        updated += 1
        return f'msgid "{msgid}"\nmsgstr "{target}"'

    def repl_multi(match: re.Match[str]) -> str:
        nonlocal updated
        msgid = match.group("id")
        if msgid not in FIXES:
            return match.group(0)
        updated += 1
        target = FIXES[msgid][lang_index]
        return f'msgid ""\n"{msgid}"\nmsgstr "{target}"'

    new_text = _SINGLE.sub(repl_single, text)
    new_text = _MULTILINE_EMPTY.sub(repl_multi, new_text)

    stripped = len(re.findall(r'^#\| msgid ".*"\n', new_text, flags=re.MULTILINE))
    new_text = re.sub(r'^#\| msgid ".*"\n', "", new_text, flags=re.MULTILINE)
    new_text = re.sub(r"^#, fuzzy\n", "", new_text, flags=re.MULTILINE)

    path.write_text(new_text, encoding="utf-8")
    return updated, stripped


def main() -> None:
    en_u, en_s = apply(ROOT / "locale/en/LC_MESSAGES/django.po", 0)
    es_u, es_s = apply(ROOT / "locale/es/LC_MESSAGES/django.po", 1)
    print(f"updated en={en_u} (stripped #|={en_s}) es={es_u} (stripped #|={es_s})")


if __name__ == "__main__":
    main()
