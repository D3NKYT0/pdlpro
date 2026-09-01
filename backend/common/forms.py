import re
from decimal import Decimal, InvalidOperation

from django import forms
from django.contrib.admin.widgets import RelatedFieldWidgetWrapper
from django.utils.html import strip_tags


_MONEY_TERMS = (
    "price",
    "amount",
    "balance",
    "bid",
    "cost",
    "fee",
    "total",
    "valor",
)

_NON_MONEY_TERMS = (
    "multiplier",
    "percent",
    "percentage",
    "rate",
    "ratio",
)


def field_name_has_segment(field_name: str, *segments: str) -> bool:
    """Return whether a snake-case field name contains one of the segments."""
    parts = field_name.lower().split("_")
    return any(segment in parts for segment in segments)


def parse_localized_decimal(value) -> str:
    """Normalize pt-BR or en-US decimal input for Django's DecimalField."""
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return format(value, "f")

    text = re.sub(r"[^\d,.-]", "", str(value).strip())
    if not text:
        return ""

    comma = text.rfind(",")
    dot = text.rfind(".")
    if comma >= 0 and dot >= 0:
        if comma > dot:
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif comma >= 0:
        text = text.replace(".", "").replace(",", ".")
    elif text.count(".") > 1:
        head, tail = text.rsplit(".", 1)
        text = f"{head.replace('.', '')}.{tail}"
    return text


class PDLMoneyWidget(forms.TextInput):
    """Text input that presents decimals using the project's pt-BR convention."""

    def __init__(self, attrs=None):
        merged = {
            "autocomplete": "off",
            "inputmode": "decimal",
            "data-pdl-mask": "money",
        }
        if attrs:
            merged.update(attrs)
        merged.pop("step", None)
        super().__init__(attrs=merged)

    def format_value(self, value):
        if value in (None, ""):
            return ""
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return value
        formatted = f"{decimal_value:,.2f}"
        return formatted.replace(",", "_").replace(".", ",").replace("_", ".")


class PDLAdminFormMixin:
    """Inject PDL widget classes, hints and safe behavior into Django forms."""

    class Media:
        css = {"all": ("pdl_admin/css/forms.css",)}
        js = ("pdl_admin/js/forms.js",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            self._enhance_field(field_name, field)

    def _enhance_field(self, field_name, field):
        widget = field.widget
        if isinstance(widget, RelatedFieldWidgetWrapper):
            widget = widget.widget
        if isinstance(widget, forms.HiddenInput):
            return

        if self._is_money_field(field_name, field, widget):
            field.widget = PDLMoneyWidget(attrs=widget.attrs.copy())
            widget = field.widget
            self._wrap_money_cleaner(field)

        self._apply_widget_classes(widget)
        self._apply_widget_metadata(field_name, field, widget)
        self._apply_html5_defaults(field_name, field, widget)
        self._apply_accessibility_hints(field_name, field, widget)

    def _apply_widget_classes(self, widget):
        if isinstance(widget, forms.MultiWidget):
            self._add_class(widget, "pdl-control form-control pdl-multi-control")
            for child in widget.widgets:
                self._add_class(child, "pdl-control form-control pdl-multi-control")
        elif self._is_select2_source(widget):
            self._add_class(widget, "pdl-select-source")
        elif isinstance(widget, forms.CheckboxInput):
            self._add_class(widget, "form-check-input pdl-check")
        elif isinstance(widget, forms.RadioSelect):
            self._add_class(widget, "pdl-choice-group pdl-radio-group")
        elif isinstance(widget, forms.CheckboxSelectMultiple):
            self._add_class(widget, "pdl-choice-group pdl-checkbox-group")
        elif isinstance(widget, (forms.Select, forms.SelectMultiple)):
            self._add_class(widget, "pdl-control form-select pdl-select")
        elif isinstance(widget, forms.Textarea):
            self._add_class(widget, "pdl-control form-control pdl-textarea")
        elif isinstance(widget, forms.FileInput):
            self._add_class(widget, "pdl-control form-control pdl-file")
        elif isinstance(widget, forms.widgets.Input):
            self._add_class(widget, "pdl-control form-control pdl-input")
        else:
            self._add_class(widget, "pdl-static-widget")

    def _apply_widget_metadata(self, field_name, field, widget):
        kind = self._field_kind(field_name, field, widget)
        widget.attrs.setdefault("data-pdl-field", field_name)
        widget.attrs.setdefault("data-pdl-kind", kind)

        if kind == "json":
            self._add_class(widget, "pdl-json")
            widget.attrs.setdefault("spellcheck", "false")
        elif kind in {"slug", "code", "uuid"}:
            self._add_class(widget, "pdl-monospace")
            widget.attrs.setdefault("spellcheck", "false")
        elif kind == "money":
            self._add_class(widget, "pdl-money")
            if "brl" in field_name.lower():
                widget.attrs.setdefault("data-pdl-currency", "BRL")
            elif "usd" in field_name.lower():
                widget.attrs.setdefault("data-pdl-currency", "USD")

    def _apply_html5_defaults(self, field_name, field, widget):
        if isinstance(widget, forms.DateTimeInput):
            widget.attrs.setdefault("type", "datetime-local")
            if not widget.format:
                widget.format = "%Y-%m-%dT%H:%M"
        elif isinstance(widget, forms.DateInput):
            widget.attrs.setdefault("type", "date")
            if not widget.format:
                widget.format = "%Y-%m-%d"
        elif isinstance(widget, forms.TimeInput):
            widget.attrs.setdefault("type", "time")
            if not widget.format:
                widget.format = "%H:%M"

        name = field_name.lower()
        if field_name_has_segment(name, "phone", "telefone", "tel", "cell", "celular"):
            widget.attrs.setdefault("data-pdl-mask", "phone")
            widget.attrs.setdefault("inputmode", "tel")
        elif field_name_has_segment(name, "cep", "zipcode") or name == "zip_code":
            widget.attrs.setdefault("data-pdl-mask", "cep")
            widget.attrs.setdefault("inputmode", "numeric")
        elif field_name_has_segment(name, "cpf"):
            widget.attrs.setdefault("data-pdl-mask", "cpf")
            widget.attrs.setdefault("inputmode", "numeric")
        elif field_name_has_segment(name, "cnpj"):
            widget.attrs.setdefault("data-pdl-mask", "cnpj")
            widget.attrs.setdefault("inputmode", "numeric")

    def _apply_accessibility_hints(self, field_name, field, widget):
        if not isinstance(
            widget,
            (forms.widgets.Input, forms.Textarea, forms.Select, forms.MultiWidget),
        ):
            return

        label = str(field.label or field_name.replace("_", " ").title()).strip()
        if label:
            widget.attrs.setdefault("aria-label", label)

        help_text = strip_tags(str(field.help_text or "")).strip()
        if help_text:
            widget.attrs.setdefault("title", help_text)

        if isinstance(
            widget,
            (
                forms.CheckboxInput,
                forms.RadioSelect,
                forms.Select,
                forms.SelectMultiple,
                forms.FileInput,
                forms.MultiWidget,
            ),
        ):
            return
        if widget.attrs.get("placeholder"):
            return

        kind = widget.attrs.get("data-pdl-kind")
        placeholders = {
            "email": "nome@exemplo.com",
            "url": "https://...",
            "date": "dd/mm/aaaa",
            "datetime": "dd/mm/aaaa hh:mm",
            "time": "hh:mm",
            "money": "0,00",
            "json": '{"chave": "valor"}',
        }
        widget.attrs["placeholder"] = placeholders.get(kind, help_text or f"Informe {label.lower()}")

    def _field_kind(self, field_name, field, widget):
        name = field_name.lower()
        if self._is_money_field(field_name, field, widget):
            return "money"
        if isinstance(widget, forms.SplitDateTimeWidget):
            return "datetime"
        if isinstance(field, forms.JSONField) or any(part in name for part in ("payload", "metadata", "settings")):
            return "json"
        if isinstance(field, forms.EmailField):
            return "email"
        if isinstance(field, forms.URLField):
            return "url"
        if isinstance(field, forms.DateTimeField):
            return "datetime"
        if isinstance(field, forms.DateField):
            return "date"
        if isinstance(field, forms.TimeField):
            return "time"
        if "slug" in name:
            return "slug"
        if "uuid" in name or name == "id":
            return "uuid"
        if field_name_has_segment(name, "code", "token", "reference"):
            return "code"
        if isinstance(widget, forms.Textarea):
            return "longtext"
        if isinstance(widget, (forms.Select, forms.SelectMultiple)):
            return "choice"
        if isinstance(widget, forms.CheckboxInput):
            return "boolean"
        if isinstance(field, (forms.IntegerField, forms.FloatField, forms.DecimalField)):
            return "number"
        return "text"

    def _is_money_field(self, field_name, field, widget):
        if not isinstance(field, forms.DecimalField):
            return False
        if isinstance(widget, (forms.Select, forms.SelectMultiple, forms.CheckboxInput)):
            return False
        name = field_name.lower()
        if field_name_has_segment(name, *_NON_MONEY_TERMS):
            return False
        return field_name_has_segment(name, *_MONEY_TERMS)

    def _wrap_money_cleaner(self, field):
        if getattr(field, "_pdl_money_cleaner", False):
            return
        original_clean = field.clean

        def clean_money(value):
            if value not in (None, ""):
                value = parse_localized_decimal(value)
            return original_clean(value)

        field.clean = clean_money
        field._pdl_money_cleaner = True

    @staticmethod
    def _is_select2_source(widget):
        classes = widget.attrs.get("class", "").split()
        return isinstance(widget, (forms.Select, forms.SelectMultiple)) and (
            "admin-autocomplete" in classes or "autocomplete" in widget.__class__.__name__.lower()
        )

    @staticmethod
    def _add_class(widget, css_classes):
        current = widget.attrs.get("class", "").split()
        for css_class in css_classes.split():
            if css_class not in current:
                current.append(css_class)
        widget.attrs["class"] = " ".join(current)


class PDLAdminModelForm(PDLAdminFormMixin, forms.ModelForm):
    """Default ModelForm base for PDL administrative interfaces."""

    pass
