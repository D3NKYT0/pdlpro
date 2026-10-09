"""Política pura dos atributos e kits iniciais, com substituição por classe."""

from dataclasses import asdict, dataclass

from common.architecture.exceptions import ValidationDomainError

INITIAL_CLASSES = (0, 10, 18, 25, 31, 38, 44, 49, 53)
INVALID_START = "Configuração inicial de personagem inválida."


def integer(value, minimum, maximum):
    """Aceita inteiros e strings decimais, sem arredondamento ou coerção de booleanos."""
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ValidationDomainError(INVALID_START)
    try:
        parsed = int(value)
    except (ValueError, TypeError) as exc:
        raise ValidationDomainError(INVALID_START) from exc
    if str(parsed) != str(value).strip() or not minimum <= parsed <= maximum:
        raise ValidationDomainError(INVALID_START)
    return parsed


@dataclass(frozen=True, slots=True)
class InitialItem:
    """Item do inventário ou equipamento; slot None significa inventário."""

    item_id: int
    quantity: int = 1
    enchant: int = 0
    slot: int | None = None


@dataclass(frozen=True, slots=True)
class CharacterStart:
    """Snapshot imutável aplicado atomicamente ao criar o personagem no jogo."""

    level: int = 1
    xp: int = 0
    sp: int = 0
    title: str = ""
    x: int = 83400
    y: int = 147940
    z: int = -3404
    items: tuple[InitialItem, ...] = ()

    def payload(self):
        """Representação JSON; XP/SP usam strings para preservar precisão na SPA."""
        result = asdict(self)
        result.update(
            xp=str(self.xp),
            sp=str(self.sp),
            items=[asdict(item) for item in self.items],
        )
        return result


def parse_start(raw, max_level=80):
    """Valida limites, slots únicos e quantidades antes de qualquer gravação."""
    if not isinstance(raw, dict) or set(raw) - set(CharacterStart.__dataclass_fields__):
        raise ValidationDomainError(INVALID_START)
    values = CharacterStart().payload() | raw
    title = values["title"]
    if not isinstance(title, str) or len(title) > 16 or any(ord(c) < 32 for c in title):
        raise ValidationDomainError(INVALID_START)
    items = values["items"]
    if not isinstance(items, list) or len(items) > 100:
        raise ValidationDomainError(INVALID_START)
    parsed, slots = [], set()
    for item in items:
        if not isinstance(item, dict) or set(item) - {
            "item_id",
            "quantity",
            "enchant",
            "slot",
        }:
            raise ValidationDomainError(INVALID_START)
        slot = item.get("slot")
        if slot is not None:
            slot = integer(slot, 0, 31)
            if slot in slots:
                raise ValidationDomainError(INVALID_START)
            slots.add(slot)
        quantity = integer(item.get("quantity", 1), 1, 2147483647)
        if slot is not None and quantity != 1:
            raise ValidationDomainError(INVALID_START)
        parsed.append(
            InitialItem(
                integer(item.get("item_id"), 1, 2147483647),
                quantity,
                integer(item.get("enchant", 0), 0, 65535),
                slot,
            )
        )
    return CharacterStart(
        level=integer(values["level"], 1, max_level),
        xp=integer(values["xp"], 0, 9223372036854775807),
        sp=integer(values["sp"], 0, 2147483647),
        title=title,
        x=integer(values["x"], -2147483648, 2147483647),
        y=integer(values["y"], -2147483648, 2147483647),
        z=integer(values["z"], -2147483648, 2147483647),
        items=tuple(parsed),
    )


def normalize_creation(raw, max_level=80):
    """Normaliza o padrão e perfis completos por classe; não mescla kits implicitamente."""
    if not isinstance(raw, dict) or set(raw) - {"default", "classes"}:
        raise ValidationDomainError(INVALID_START)
    default = parse_start(raw.get("default", {}), max_level)
    classes = raw.get("classes", {})
    if not isinstance(classes, dict) or set(classes) - {
        str(cid) for cid in INITIAL_CLASSES
    }:
        raise ValidationDomainError(INVALID_START)
    normalized = {}
    for key, value in classes.items():
        if not isinstance(value, dict):
            raise ValidationDomainError(INVALID_START)
        normalized[key] = parse_start(default.payload() | value, max_level).payload()
    return {"default": default.payload(), "classes": normalized}


def resolve_start(raw, class_id, max_level=80):
    """Seleciona o perfil da classe ou o padrão geral validado."""
    normalized = normalize_creation(raw or {}, max_level)
    return parse_start(
        normalized["classes"].get(str(class_id), normalized["default"]), max_level
    )
