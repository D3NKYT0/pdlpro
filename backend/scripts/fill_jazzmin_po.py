"""Fill Jazzmin chrome template translations and clear bad fuzzy matches."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# msgid PT -> (en, es)
FIXES: dict[str, tuple[str, str]] = {
    "Barra de comandos": ("Command bar", "Barra de comandos"),
    "Alternar menu lateral": ("Toggle sidebar", "Alternar menú lateral"),
    "Central de operações": ("Operations hub", "Central de operaciones"),
    "Componentes": ("Components", "Componentes"),
    "Busca global": ("Global search", "Búsqueda global"),
    "Localizar registros": ("Find records", "Localizar registros"),
    "Pesquisar...": ("Search...", "Buscar..."),
    "Pesquisar %(name)s": ("Search %(name)s", "Buscar %(name)s"),
    "Pesquisar": ("Search", "Buscar"),
    "Documentação": ("Documentation", "Documentación"),
    "Aparência": ("Appearance", "Apariencia"),
    "Tema": ("Theme", "Tema"),
    "Modo": ("Mode", "Modo"),
    "Claro": ("Light", "Claro"),
    "Escuro": ("Dark", "Oscuro"),
    "Automático": ("Auto", "Automático"),
    "Idioma": ("Language", "Idioma"),
    "Superadministrador": ("Superadmin", "Superadministrador"),
    "Equipe": ("Staff", "Equipo"),
    "Sessão administrativa": ("Admin session", "Sesión administrativa"),
    "Meu perfil": ("My profile", "Mi perfil"),
    "Dados e permissões": ("Details and permissions", "Datos y permisos"),
    "Alterar senha": ("Change password", "Cambiar contraseña"),
    "Segurança da conta": ("Account security", "Seguridad de la cuenta"),
    "Acesso rápido": ("Quick access", "Acceso rápido"),
    "Encerrar sessão": ("Sign out", "Cerrar sesión"),
    "Painel administrativo": ("Admin panel", "Panel administrativo"),
    "Operador ativo": ("Active operator", "Operador activo"),
    "Sessão ativa": ("Active session", "Sesión activa"),
    "Navegação": ("Navigation", "Navegación"),
    "Navegação administrativa": ("Admin navigation", "Navegación administrativa"),
    "Visão geral": ("Overview", "Vista general"),
    "Ambiente protegido": ("Protected environment", "Entorno protegido"),
    "Administração PDL": ("PDL administration", "Administración PDL"),
    "Fechar": ("Close", "Cerrar"),
    "Central administrativa": ("Admin center", "Central administrativa"),
    "Configuração visual": ("Visual settings", "Configuración visual"),
    "Componentes de interface": ("UI components", "Componentes de interfaz"),
    "Componentes reais do admin. As ações desta página são exemplos locais e não alteram registros.": (
        "Real admin components. Actions on this page are local examples and do not change records.",
        "Componentes reales del admin. Las acciones de esta página son ejemplos locales y no alteran registros.",
    ),
    "Botões e variantes": ("Buttons and variants", "Botones y variantes"),
    "Exemplo salvo.": ("Example saved.", "Ejemplo guardado."),
    "Salvar": ("Save", "Guardar"),
    "Exemplo cancelado.": ("Example cancelled.", "Ejemplo cancelado."),
    "Cancelar": ("Cancel", "Cancelar"),
    "Exemplo aprovado.": ("Example approved.", "Ejemplo aprobado."),
    "Aprovar": ("Approve", "Aprobar"),
    "Exemplo enviado para revisão.": ("Example sent for review.", "Ejemplo enviado a revisión."),
    "Revisar": ("Review", "Revisar"),
    "Exclusão demonstrada; nenhum registro foi removido.": (
        "Deletion demonstrated; no records were removed.",
        "Eliminación demostrada; no se eliminó ningún registro.",
    ),
    "Remover": ("Remove", "Eliminar"),
    "Tamanho conforme o conteúdo": ("Size follows content", "Tamaño según el contenido"),
    "Edição demonstrativa.": ("Demo edit.", "Edición de demostración."),
    "Editar": ("Edit", "Editar"),
    "Criação demonstrativa.": ("Demo create.", "Creación de demostración."),
    "Criar novo registro": ("Create new record", "Crear nuevo registro"),
    "Exportação demonstrativa.": ("Demo export.", "Exportación de demostración."),
    "Exportar relatório": ("Export report", "Exportar informe"),
    "Atualizar lista": ("Refresh list", "Actualizar lista"),
    "Lista demonstrativa atualizada.": ("Demo list refreshed.", "Lista de demostración actualizada."),
    "Estados e links": ("States and links", "Estados y enlaces"),
    "Indisponível": ("Unavailable", "No disponible"),
    "Voltar ao admin": ("Back to admin", "Volver al admin"),
    "Link indisponível": ("Unavailable link", "Enlace no disponible"),
    "Salvar e continuar": ("Save and continue", "Guardar y continuar"),
    "Escolha uma ação para experimentar.": ("Choose an action to try.", "Elija una acción para probar."),
}

ENTRY = re.compile(
    r"(?P<head>(?:^#.*\n)*)"
    r"(?P<body>msgid (?P<raw>(?:\"\"\n(?:\".*\"\n)+|\".*\"\n))"
    r"msgstr (?:\"\"\n(?:\".*\"\n)*|\".*\"\n))",
    re.MULTILINE,
)


def decode_msgid(raw: str) -> str:
    parts = re.findall(r'"(.*?)"', raw, re.DOTALL)
    text = "".join(parts)
    return (
        text.replace(r"\\", "\0")
        .replace(r"\"", '"')
        .replace(r"\n", "\n")
        .replace(r"\t", "\t")
        .replace("\0", "\\")
    )


def encode_msgstr(value: str) -> str:
    escaped = (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\t", "\\t")
    )
    if "\n" in value or len(escaped) > 70:
        chunks = [escaped[i : i + 70] for i in range(0, len(escaped), 70)] or [""]
        body = "\n".join(f'"{chunk}"' for chunk in chunks)
        return f'msgstr ""\n{body}\n'
    return f'msgstr "{escaped}"\n'


def apply(path: Path, lang_index: int) -> int:
    text = path.read_text(encoding="utf-8")
    updated = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal updated
        msgid = decode_msgid(match.group("raw"))
        if msgid not in FIXES:
            return match.group(0)
        target = FIXES[msgid][lang_index]
        head_lines = [
            line
            for line in match.group("head").splitlines(keepends=True)
            if not line.startswith("#|") and line.strip() != "#, fuzzy"
        ]
        # drop fuzzy flag from mixed flag lines
        cleaned_head: list[str] = []
        for line in head_lines:
            if line.startswith("#,") and "fuzzy" in line:
                flags = [f.strip() for f in line[2:].split(",") if f.strip() and f.strip() != "fuzzy"]
                if flags:
                    cleaned_head.append("#, " + ", ".join(flags) + "\n")
                continue
            cleaned_head.append(line)
        updated += 1
        return "".join(cleaned_head) + f'msgid "{msgid}"\n' + encode_msgstr(target)

    # Prefer single-line msgid form when original was single-line; for multiline
    # msgids keep a simple single-line msgid rewrite (Django accepts it).
    new_text = ENTRY.sub(repl, text)
    path.write_text(new_text, encoding="utf-8")
    return updated


def main() -> None:
    en = apply(ROOT / "locale/en/LC_MESSAGES/django.po", 0)
    es = apply(ROOT / "locale/es/LC_MESSAGES/django.po", 1)
    print(f"updated en={en} es={es}")


if __name__ == "__main__":
    main()
