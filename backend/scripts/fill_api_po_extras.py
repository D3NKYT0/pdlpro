"""Append missing API message translations and refill catalogs."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXTRA = {
    "Resolva o CAPTCHA para criar sua conta.": (
        "Solve the CAPTCHA to create your account.",
        "Resuelve el CAPTCHA para crear tu cuenta.",
    ),
    "Resolva o CAPTCHA para continuar.": (
        "Solve the CAPTCHA to continue.",
        "Resuelve el CAPTCHA para continuar.",
    ),
    "Validação CSRF necessária.": (
        "CSRF validation required.",
        "Validación CSRF necesaria.",
    ),
    "Refresh token ausente.": (
        "Refresh token missing.",
        "Falta el refresh token.",
    ),
    "Não foi possível autenticar com esta chave.": (
        "Could not authenticate with this key.",
        "No se pudo autenticar con esta clave.",
    ),
    "Use 3 a 16 letras ou números, sem espaços.": (
        "Use 3 to 16 letters or numbers, without spaces.",
        "Usa de 3 a 16 letras o números, sin espacios.",
    ),
    "Conecte o banco do jogo para transferir moedas.": (
        "Connect the game database to transfer coins.",
        "Conecta la base de datos del juego para transferir monedas.",
    ),
    "Selecione uma recompensa.": (
        "Select a reward.",
        "Selecciona una recompensa.",
    ),
    "Configuração desconhecida.": (
        "Unknown configuration.",
        "Configuración desconocida.",
    ),
    "Use um nome de até 30 letras, sem termos ofensivos.": (
        "Use a name of up to 30 letters, without offensive terms.",
        "Usa un nombre de hasta 30 letras, sin términos ofensivos.",
    ),
    "Inclua pelo menos um item.": (
        "Include at least one item.",
        "Incluye al menos un ítem.",
    ),
    "A data final deve ser posterior à inicial.": (
        "The end date must be after the start date.",
        "La fecha final debe ser posterior a la inicial.",
    ),
    "A data final deve ser igual ou posterior à inicial.": (
        "The end date must be on or after the start date.",
        "La fecha final debe ser igual o posterior a la inicial.",
    ),
    "O máximo deve ser maior ou igual ao mínimo.": (
        "The maximum must be greater than or equal to the minimum.",
        "El máximo debe ser mayor o igual que el mínimo.",
    ),
    "A imagem deve ter no máximo 5 MB.": (
        "The image must be at most 5 MB.",
        "La imagen debe tener como máximo 5 MB.",
    ),
    "A imagem deve ter no máximo 2 MB.": (
        "The image must be at most 2 MB.",
        "La imagen debe tener como máximo 2 MB.",
    ),
    "A descrição é obrigatória.": (
        "Description is required.",
        "La descripción es obligatoria.",
    ),
    "Use PNG, JPEG ou WebP estático.": (
        "Use PNG, JPEG or static WebP.",
        "Usa PNG, JPEG o WebP estático.",
    ),
    "Dimensões máximas: 1024 × 1024 pixels.": (
        "Maximum dimensions: 1024 × 1024 pixels.",
        "Dimensiones máximas: 1024 × 1024 píxeles.",
    ),
    "Imagem inválida.": ("Invalid image.", "Imagen no válida."),
    "Imagem obrigatória.": ("Image required.", "Imagen obligatoria."),
    "Você não tem permissão para esta ação.": (
        "You do not have permission for this action.",
        "No tienes permiso para esta acción.",
    ),
    "ID de item inválido.": ("Invalid item ID.", "ID de ítem no válido."),
    "Envie um arquivo .zip.": ("Upload a .zip file.", "Envía un archivo .zip."),
    "Assinatura inválida.": ("Invalid signature.", "Firma no válida."),
    "Não foi possível consultar os itens. Confira a conexão L2 e o módulo SQL.": (
        "Could not query items. Check the L2 connection and SQL module.",
        "No se pudieron consultar los ítems. Revisa la conexión L2 y el módulo SQL.",
    ),
    "Use apenas letras e números, sem espaços ou símbolos.": (
        "Use only letters and numbers, without spaces or symbols.",
        "Usa solo letras y números, sin espacios ni símbolos.",
    ),
    "O nome de usuário deve ter entre 3 e 16 caracteres.": (
        "Username must be between 3 and 16 characters.",
        "El nombre de usuario debe tener entre 3 y 16 caracteres.",
    ),
    "Autenticação necessária.": ("Authentication required.", "Autenticación necesaria."),
    "Método não permitido.": ("Method not allowed.", "Método no permitido."),
    "O conteúdo enviado excede o tamanho permitido.": (
        "The uploaded content exceeds the allowed size.",
        "El contenido enviado supera el tamaño permitido.",
    ),
    "Formato de conteúdo não suportado.": (
        "Unsupported content type.",
        "Formato de contenido no compatible.",
    ),
    "Muitas tentativas. Aguarde um momento e tente novamente.": (
        "Too many attempts. Wait a moment and try again.",
        "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    ),
    "Ocorreu um erro interno. Tente novamente em instantes.": (
        "An internal error occurred. Try again shortly.",
        "Ocurrió un error interno. Inténtalo de nuevo en unos instantes.",
    ),
    "Um serviço necessário respondeu com erro.": (
        "A required service responded with an error.",
        "Un servicio necesario respondió con error.",
    ),
    "Serviço temporariamente indisponível.": (
        "Service temporarily unavailable.",
        "Servicio temporalmente no disponible.",
    ),
    "Um serviço necessário demorou demais para responder.": (
        "A required service took too long to respond.",
        "Un servicio necesario tardó demasiado en responder.",
    ),
    "Ação 2FA inválida.": ("Invalid 2FA action.", "Acción 2FA no válida."),
    "recurso não encontrado": ("resource not found", "recurso no encontrado"),
    "Moderador": ("Moderator", "Moderador"),
    "Equipe": ("Staff", "Equipo"),
    "Nível": ("Level", "Nivel"),
    "Cancelado": ("Cancelled", "Cancelado"),
    "Primeiros passos": ("Getting started", "Primeros pasos"),
    "Loja e comércio": ("Shop and trade", "Tienda y comercio"),
    "Conteúdo e comunidade": ("Content and community", "Contenido y comunidad"),
    "Todos os usuários": ("All users", "Todos los usuarios"),
    "Dormir": ("Sleep", "Dormir"),
    "Brincar": ("Play", "Jugar"),
    "Dar banho": ("Bathe", "Bañar"),
    "Caminhar": ("Walk", "Caminar"),
    "Dançar juntos": ("Dance together", "Bailar juntos"),
    "Diária": ("Daily", "Diaria"),
    "Semanal": ("Weekly", "Semanal"),
    "Log de recompensa de jogo": ("Game reward log", "Registro de recompensa de juego"),
    "Logs de recompensa de jogo": ("Game reward logs", "Registros de recompensa de juego"),
    "À venda": ("For sale", "En venta"),
    "Vendido": ("Sold", "Vendido"),
    "Em disputa": ("In dispute", "En disputa"),
    "Pendente": ("Pending", "Pendiente"),
    "Processando": ("Processing", "Procesando"),
    "Confirmado": ("Confirmed", "Confirmado"),
    "Falhou": ("Failed", "Falló"),
    "Real": ("Brazilian real", "Real"),
    "Dólar": ("US dollar", "Dólar"),
    "Os metadados devem ser um objeto JSON.": (
        "Metadata must be a JSON object.",
        "Los metadatos deben ser un objeto JSON.",
    ),
    "Metadados limitados a 16 KB.": (
        "Metadata limited to 16 KB.",
        "Metadatos limitados a 16 KB.",
    ),
    "ID no jogo": ("In-game ID", "ID en el juego"),
    "Nome": ("Name", "Nombre"),
    "Imagem": ("Image", "Imagen"),
    "Tipo": ("Type", "Tipo"),
    "Grau": ("Grade", "Grado"),
    "Negociável": ("Tradable", "Negociable"),
    "Ativo": ("Active", "Activo"),
    "Informe uma lista de até 2000 IDs positivos, sem repetições.": (
        "Provide a list of up to 2000 positive IDs, without duplicates.",
        "Indica una lista de hasta 2000 IDs positivos, sin repeticiones.",
    ),
    "IDs dos itens": ("Item IDs", "IDs de los ítems"),
    "Ordem": ("Order", "Orden"),
    "Data": ("Date", "Fecha"),
    "Origem L2": ("L2 origin", "Origen L2"),
    "Personagens": ("Characters", "Personajes"),
    "Stacks L2": ("L2 stacks", "Stacks L2"),
    "Quantidade no painel": ("Panel quantity", "Cantidad en el panel"),
    "Notas": ("Notes", "Notas"),
    "Snapshot de itens": ("Item snapshot", "Instantánea de ítems"),
    "Snapshots de itens": ("Item snapshots", "Instantáneas de ítems"),
    "Pode capturar snapshot dos itens L2": (
        "Can capture L2 item snapshot",
        "Puede capturar instantánea de ítems L2",
    ),
    "Detalhe de observação": ("Observation detail", "Detalle de observación"),
    "Estornado": ("Refunded", "Reembolsado"),
}


def apply(path: Path, lang_index: int) -> int:
    text = path.read_text(encoding="utf-8")
    updated = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal updated
        msgid = match.group(1)
        current = match.group(2)
        if msgid in EXTRA and (not current or current == msgid):
            updated += 1
            return f'msgid "{msgid}"\nmsgstr "{EXTRA[msgid][lang_index]}"'
        return match.group(0)

    # single-line entries only
    new_text = re.sub(
        r'^msgid "(?P<id>[^"]+)"\nmsgstr "(?P<str>[^"]*)"$',
        repl,
        text,
        flags=re.M,
    )
    # remove fuzzy for refresh token if present
    new_text = new_text.replace("#, fuzzy\n", "")
    path.write_text(new_text, encoding="utf-8")
    return updated


def main() -> None:
    en = apply(ROOT / "locale/en/LC_MESSAGES/django.po", 0)
    es = apply(ROOT / "locale/es/LC_MESSAGES/django.po", 1)
    print(f"updated en={en} es={es}")


if __name__ == "__main__":
    main()
