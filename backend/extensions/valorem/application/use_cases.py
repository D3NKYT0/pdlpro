from extensions.valorem.domain.entities import ValoremWikiStatus


class GetValoremWikiStatusUseCase:
    """Retorna métricas e status operacional do sistema de Game Wiki do Valorem."""

    def execute(self) -> ValoremWikiStatus:
        return ValoremWikiStatus(
            active=True,
            version="1.0.0",
            total_items=10132,
            total_bosses=221,
            total_skills=8711,
        )
