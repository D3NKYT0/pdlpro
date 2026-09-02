from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class FinancialReportInput:
    """Filtros e paginação usados pela porta de relatórios financeiros.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Use Decimal para valores monetários,
    evitando conversão intermediária por float.
    """

    report: str
    username: str = ""
    status: str = ""
    method: str = ""
    currency: str = ""
    date_from: date | None = None
    date_to: date | None = None
    minimum: Decimal | None = None
    maximum: Decimal | None = None
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True, slots=True)
class FinancialReportResult:
    """Linhas, totais e metadados devolvidos pela consulta financeira.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    count: int
    total_pages: int
    results: list[dict]
    summary: dict


class IFinancialReportRepository(ABC):
    """Porta de consultas agregadas de saldos, fluxo de caixa e pagamentos.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def report(self, data: FinancialReportInput) -> FinancialReportResult:
        raise NotImplementedError
