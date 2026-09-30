import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { staffApi } from '../../services/api'
import type { ApiMetricSeries, ApiRecentAuditEntry } from '../../services/api'
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  DollarSign,
  LogIn,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import './observability.css'

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className="metrics-kpi" data-tone={tone}>
      <span className="metrics-kpi-icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="metrics-kpi-body">
        <span className="metrics-kpi-value">{value}</span>
        <span className="metrics-kpi-label">{label}</span>
      </div>
    </div>
  )
}

function MiniBar({ series, height = 48 }: { series: ApiMetricSeries[]; height?: number }) {
  if (!series.length) return <span className="muted">—</span>
  const max = Math.max(...series.map((s) => s.value), 1)
  return (
    <div className="metrics-minibar" style={{ height }} role="img" aria-label="sparkline">
      {series.map((s, i) => (
        <div
          key={i}
          className="metrics-minibar-col"
          style={{ height: `${(s.value / max) * 100}%` }}
          title={`${s.label}: ${s.value}`}
        />
      ))}
    </div>
  )
}

function RecentAuditTable({ entries, t }: { entries: ApiRecentAuditEntry[]; t: (k: string) => string }) {
  if (!entries.length) return <p className="muted">{t('metrics.noRecentAudit')}</p>
  return (
    <table className="metrics-audit-table">
      <thead>
        <tr>
          <th>{t('metrics.colDate')}</th>
          <th>{t('metrics.colActor')}</th>
          <th>{t('metrics.colAction')}</th>
          <th>{t('metrics.colStatus')}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i}>
            <td className="metrics-cell-date">{new Date(e.created_at).toLocaleString()}</td>
            <td>{e.actor_username || '—'}</td>
            <td className="metrics-cell-action" title={e.action}>{e.action}</td>
            <td>
              <span className={`audit-status-badge audit-status-${e.status_code < 400 ? 'success' : 'warning'}`}>
                {e.status_code}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TopActionsChart({ actions, t }: { actions: ApiMetricSeries[]; t: (k: string) => string }) {
  if (!actions.length) return <p className="muted">{t('metrics.noActions')}</p>
  const max = Math.max(...actions.map((a) => a.value), 1)
  return (
    <div className="metrics-top-actions">
      {actions.slice(0, 8).map((a, i) => (
        <div key={i} className="metrics-action-row">
          <span className="metrics-action-label" title={a.label}>
            {a.label.length > 35 ? a.label.slice(0, 35) + '…' : a.label}
          </span>
          <div className="metrics-action-bar-bg">
            <div className="metrics-action-bar" style={{ width: `${(a.value / max) * 100}%` }} />
          </div>
          <span className="metrics-action-count">{a.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AdminMetricsPage() {
  const { t } = useTranslation('admin')

  const query = useQuery({
    queryKey: ['staff-metrics-dashboard'],
    queryFn: staffApi.metricsDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const d = query.data

  return (
    <div className="account-page admin-metrics">
      <Card as="header" className="account-hero" data-theme-part="page-header">
        <div>
          <span className="panel-eyebrow">{t('metrics.kicker')}</span>
          <h1>{t('metrics.title')}</h1>
          <p className="muted">{t('metrics.description')}</p>
        </div>
        <span className="account-status-pill is-active">
          <Activity aria-hidden="true" />
          {t('metrics.badge')}
        </span>
      </Card>

      {query.isLoading ? (
        <Card><p className="muted">{t('chrome.loading')}</p></Card>
      ) : query.isError ? (
        <Card><p className="muted">{t('metrics.error')}</p></Card>
      ) : d ? (
        <>
          {/* KPI Grid */}
          <div className="metrics-kpi-grid">
            <KpiCard icon={UserPlus} label={t('metrics.registrationsToday')} value={d.registrations_today} tone="success" />
            <KpiCard icon={LogIn} label={t('metrics.loginsToday')} value={d.logins_today} tone="info" />
            <KpiCard icon={DollarSign} label={t('metrics.revenueToday')} value={`R$ ${d.revenue_today_brl.toFixed(2)}`} tone="finance" />
            <KpiCard icon={Users} label={t('metrics.activeUsers24h')} value={d.active_users_24h} tone="info" />
            <KpiCard icon={Users} label={t('metrics.totalUsers')} value={d.total_users} tone="neutral" />
            <KpiCard icon={BarChart3} label={t('metrics.totalOrders')} value={d.total_orders} tone="neutral" />
            <KpiCard icon={ShieldAlert} label={t('metrics.pendingOrders')} value={d.pending_orders} tone="warning" />
            <KpiCard icon={ShieldAlert} label={t('metrics.failedWebhooks')} value={d.failed_webhooks_24h} tone={d.failed_webhooks_24h > 0 ? 'danger' : 'neutral'} />
            <KpiCard icon={ClipboardCheck} label={t('metrics.auditEvents24h')} value={d.audit_events_24h} tone="neutral" />
          </div>

          {/* Series Charts */}
          <div className="metrics-charts-row">
            <Card className="metrics-chart-card">
              <h3>{t('metrics.registrationsSeries')}</h3>
              <MiniBar series={d.registrations_series} height={64} />
            </Card>
            <Card className="metrics-chart-card">
              <h3>{t('metrics.revenueSeries')}</h3>
              <MiniBar series={d.revenue_series} height={64} />
            </Card>
          </div>

          {/* Top Actions + Recent Audit */}
          <div className="metrics-detail-row">
            <Card className="metrics-detail-card">
              <h3>{t('metrics.topActions')}</h3>
              <TopActionsChart actions={d.top_actions} t={t} />
            </Card>
            <Card className="metrics-detail-card">
              <h3>{t('metrics.recentAudit')}</h3>
              <RecentAuditTable entries={d.recent_audit} t={t} />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
