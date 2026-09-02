from django.utils.text import slugify


class TitleSlugMixin:
    """Preenche slug vazio a partir do título sem modificar slugs já publicados.

    Use antes do modelo Django na herança. Não resolve colisões: a restrição
    unique do campo continua responsável por recusá-las, como nos modelos atuais.
    """

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[: self._meta.get_field("slug").max_length]
        super().save(*args, **kwargs)
