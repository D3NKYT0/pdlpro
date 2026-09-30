import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { staffApi } from '../../services/api'
import type { ApiAuditLogFilters } from '../../services/api'
import { ClipboardCheck, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import './observability.css'

function StatusBadge({ code }: { code: number }) {
  const tone = code < 300 ? 'success' : code < 400 ? 'info' : code < 500 ? 'warning' : 'danger'
  return <span className={`audit-status-badge audit-status-${tone}`}>{code}</span>
}

function MethodBadge({ method }: { method: string }) {
  const tone = method === 'DELETE' ? 'danger' : method === 'POST' ? 'success' : method === 'PUT' ? 'warning' : 'info'
  return <span className={`audit-method-badge audit-method-${tone}`}>{method}</span>
}

export function AdminAuditLogPage() {
  const { t } = useTranslation('admin')
  const [filters, setFilters] = useState<ApiAuditLogFilters>({ page: 1, page_size: 20 })
  const [showFilters, setShowFilters] = useState(false)

  const query = useQuery({
    queryKey: ['staff-audit-logs', filters],
    queryFn: () => staffApi.auditLogs(filters),
    staleTime: 10_000,
  })

  const data = query.data
  const results = data?.results ?? []

  const updateFilter = (patch: Partial<ApiAuditLogFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))

  return (
    <div className="account-page admin-audit-log">
      <Card as="header" className="account-hero" data-theme-part="page-header">
        <div>
          <span className="panel-eyebrow">{t('auditLog.kicker')}</span>
          <h1>{t('auditLog.title')}</h1>
          <p className="muted">{t('auditLog.description')}</p>
        </div>
        <span className="account-status-pill is-active">
          <ClipboardCheck aria-hidden="true" />
          {t('auditLog.badge')}
        </span>
      </Card>

      {/* Search + Filter toggle */}
      <Card className="audit-toolbar" data-theme-part="toolbar">
        <div className="audit-search-row">
          <div className="audit-search-input">
            <Search aria-hidden="true" />
            <input
              id="audit-search"
              type="text"
              placeholder={t('auditLog.searchPlaceholder')}
              value={filters.search ?? ''}
              onChange={(e) => updateFilter({ search: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <Filter aria-hidden="true" />
            {t('auditLog.filters')}
          </button>
        </div>

        {showFilters && (
          <div className="audit-filters-grid">
            <label>
              <span>{t('auditLog.filterActor')}</span>
              <input
                type="text"
                value={filters.actor ?? ''}
                onChange={(e) => updateFilter({ actor: e.target.value })}
              />
            </label>
            <label>
              <span>{t('auditLog.filterAction')}</span>
              <input
                type="text"
                value={filters.action ?? ''}
                onChange={(e) => updateFilter({ action: e.target.value })}
              />
            </label>
            <label>
              <span>{t('auditLog.filterMethod')}</span>
              <select
                value={filters.method ?? ''}
                onChange={(e) => updateFilter({ method: e.target.value })}
              >
                <option value="">{t('auditLog.allMethods')}</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>
            <label>
              <span>{t('auditLog.filterDateFrom')}</span>
              <input
                type="date"
                value={filters.date_from ?? ''}
                onChange={(e) => updateFilter({ date_from: e.target.value ? `${e.target.value}T00:00:00Z` : '' })}
              />
            </label>
            <label>
              <span>{t('auditLog.filterDateTo')}</span>
              <input
                type="date"
                value={filters.date_to ?? ''}
                onChange={(e) => updateFilter({ date_to: e.target.value ? `${e.target.value}T23:59:59Z` : '' })}
              />
            </label>
          </div>
        )}
      </Card>

      {/* Results table */}
      <Card className="audit-results" data-theme-part="data-table">
        {query.isLoading ? (
          <p className="muted audit-loading">{t('chrome.loading')}</p>
        ) : query.isError ? (
          <p className="muted audit-error">{t('auditLog.error')}</p>
        ) : results.length === 0 ? (
          <p className="muted audit-empty">{t('auditLog.empty')}</p>
        ) : (
          <>
            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>{t('auditLog.colDate')}</th>
                    <th>{t('auditLog.colActor')}</th>
                    <th>{t('auditLog.colMethod')}</th>
                    <th>{t('auditLog.colAction')}</th>
                    <th>{t('auditLog.colStatus')}</th>
                    <th>{t('auditLog.colIp')}</th>
                    <th>{t('auditLog.colPath')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((entry) => (
                    <tr key={entry.id}>
                      <td className="audit-cell-date">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td>{entry.actor_username || '—'}</td>
                      <td><MethodBadge method={entry.method} /></td>
                      <td className="audit-cell-action" title={entry.action}>{entry.action}</td>
                      <td><StatusBadge code={entry.status_code} /></td>
                      <td className="audit-cell-ip">{entry.ip_address || '—'}</td>
                      <td className="audit-cell-path" title={entry.path}>{entry.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="audit-pagination">
              <span className="audit-pagination-info">
                {t('auditLog.showing', {
                  from: ((filters.page ?? 1) - 1) * (filters.page_size ?? 20) + 1,
                  to: Math.min((filters.page ?? 1) * (filters.page_size ?? 20), data?.count ?? 0),
                  total: data?.count ?? 0,
                })}
              </span>
              <div className="audit-pagination-controls">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <span>
                  {filters.page ?? 1} / {data?.total_pages ?? 1}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={(filters.page ?? 1) >= (data?.total_pages ?? 1)}
                  onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
