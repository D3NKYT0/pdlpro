import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  ClipboardList,
  Coins,
  Handshake,
  History,
  Percent,
  TicketPercent,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { programsApi } from '../services/api'
import { formatDate, formatDateTime } from '../lib/formatters'
import { Empty, ErrorNotice, Loading, Status } from '../components/programs/ProgramUI'
import { useProgramAction } from '../components/programs/useProgramAction'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: LucideIcon; eyebrow: string; title: string }) {
  return (
    <div className="progress-module-heading">
      <span><Icon aria-hidden="true" /></span>
      <div>
        <span className="panel-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

export function SupportersPage() {
  const { t } = useTranslation('panel')
  const query = useQuery({
    queryKey: ['supporter'],
    queryFn: programsApi.supporter,
  })
  const [image, setImage] = useState<File | null>(null)
  const action = useProgramAction()
  const data = query.data
  const profile = data?.profile
  return (
    <div className="supporters-page">
      <PageHeader
        className="supporters-hero"
        eyebrow={t('supporters.eyebrow')}
        title={t('supporters.title')}
        description={t('supporters.description')}
        leading={<span className="supporters-hero-emblem"><Handshake aria-hidden="true" /></span>}
        actions={data ? (
          <div className="supporters-balance">
            <Coins aria-hidden="true" />
            <span>{t('supporters.available')}</span>
            <strong>{t('supporters.coins', { amount: Number(data.available).toFixed(2) })}</strong>
          </div>
        ) : undefined}
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <div className="supporters-overview">
            <Card as="div" className="supporters-stat">
              <Coins aria-hidden="true" />
              <small>{t('supporters.available')}</small>
              <strong>{t('supporters.coins', { amount: Number(data.available).toFixed(2) })}</strong>
            </Card>
            <Card as="div" className="supporters-stat">
              <Percent aria-hidden="true" />
              <small>{t('supporters.share')}</small>
              <strong>{profile?.commission_percent || '0'}%</strong>
            </Card>
            <Card as="div" className="supporters-stat">
              <ClipboardList aria-hidden="true" />
              <small>{t('supporters.registration')}</small>
              {profile ? (
                <Status value={profile.status} />
              ) : (
                <strong className="supporters-stat-muted">{t('supporters.notSubmitted')}</strong>
              )}
            </Card>
          </div>

          <div className="supporters-layout">
            <Card className="supporters-panel">
              <SectionHeading
                icon={Handshake}
                eyebrow={profile ? t('supporters.profileEyebrow') : t('supporters.joinEyebrow')}
                title={profile ? t('supporters.profileTitle') : t('supporters.joinTitle')}
              />
              {profile?.review_note && (
                <p className="program-note">
                  {t('supporters.reviewNote', { note: profile.review_note })}
                </p>
              )}
              <form
                key={profile?.id || 'new'}
                className="program-form supporters-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  form.delete('image')
                  if (image) form.set('image', image)
                  void action.run(
                    () => programsApi.apply(form),
                    t('supporters.applyToast'),
                    [['supporter']],
                  )
                }}
              >
                {profile?.image && (
                  <img
                    src={profile.image}
                    className="program-avatar"
                    alt={profile.name}
                  />
                )}
                <Field label={t('supporters.nameLabel')}>
                  <input
                    name="name"
                    defaultValue={profile?.name}
                    required
                    maxLength={100}
                    placeholder={t('supporters.namePlaceholder')}
                  />
                </Field>
                <Field label={t('supporters.channelLabel')}>
                  <input
                    name="channel_url"
                    defaultValue={profile?.channel_url}
                    type="url"
                    required
                    placeholder="https://…"
                  />
                </Field>
                <Field label={t('supporters.aboutLabel')}>
                  <textarea
                    name="description"
                    defaultValue={profile?.description}
                    maxLength={2000}
                    placeholder={t('supporters.aboutPlaceholder')}
                  />
                </Field>
                <Field label={t('supporters.imageLabel')} hint={t('supporters.imageHint')}>
                  <input
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      const problem = !file
                        ? null
                        : !IMAGE_TYPES.includes(file.type)
                          ? 'supporters.imageUnsupportedFormat'
                          : file.size > MAX_IMAGE_BYTES
                            ? 'supporters.imageTooLarge'
                            : null
                      if (problem) {
                        toast.error(t(problem))
                        event.target.value = ''
                        setImage(null)
                        return
                      }
                      setImage(file)
                    }}
                  />
                </Field>
                <div className="program-actions">
                  <Button disabled={action.busy} type="submit">
                    {action.busy
                      ? t('supporters.sending')
                      : profile
                        ? t('supporters.saveProfile')
                        : t('supporters.apply')}
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                </div>
              </form>
            </Card>

            <div className="supporters-side">
              <Card className="supporters-panel">
                <SectionHeading
                  icon={TicketPercent}
                  eyebrow={t('supporters.couponsEyebrow')}
                  title={t('supporters.couponsTitle')}
                />
                {data.coupons.length ? (
                  data.coupons.map((coupon) => (
                    <article className="program-item" key={coupon.code}>
                      <div className="program-section-heading">
                        <strong>{coupon.code}</strong>
                        <Status value={coupon.active ? 'available' : 'rejected'} />
                      </div>
                      <p>
                        {t('supporters.couponSummary', {
                          percent: coupon.percent,
                          uses: coupon.uses,
                        })}
                      </p>
                    </article>
                  ))
                ) : (
                  <Empty icon={<TicketPercent aria-hidden="true" />}>{t('supporters.couponsEmpty')}</Empty>
                )}
              </Card>

              <Card className="supporters-panel">
                <SectionHeading
                  icon={Wallet}
                  eyebrow={t('supporters.payoutEyebrow')}
                  title={t('supporters.payoutTitle')}
                />
                <p className="muted">{t('supporters.payoutDescription')}</p>
                <div className="program-actions">
                  <Button
                    type="button"
                    disabled={
                      action.busy ||
                      profile?.status !== 'approved' ||
                      Number(data.available) <= 0
                    }
                    onClick={() =>
                      void action.run(
                        programsApi.payout,
                        t('supporters.payoutToast'),
                        [['supporter']],
                      )
                    }
                  >
                    <Coins aria-hidden="true" />
                    {t('supporters.payoutAction')}
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          <Card className="supporters-panel">
            <SectionHeading
              icon={History}
              eyebrow={t('supporters.payoutsEyebrow')}
              title={t('supporters.payoutsTitle')}
            />
            {data.payouts.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>{t('supporters.table.date')}</th>
                      <th>{t('supporters.table.amount')}</th>
                      <th>{t('supporters.table.status')}</th>
                      <th>{t('supporters.table.note')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td>{formatDate(payout.created_at)}</td>
                        <td>{payout.amount}</td>
                        <td><Status value={payout.status} /></td>
                        <td>{payout.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon={<History aria-hidden="true" />}>{t('supporters.payoutsEmpty')}</Empty>
            )}
          </Card>

          <Card className="supporters-panel">
            <SectionHeading
              icon={Coins}
              eyebrow={t('supporters.commissionsEyebrow')}
              title={t('supporters.commissionsTitle')}
            />
            {data.commissions.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>{t('supporters.table.purchasedAt')}</th>
                      <th>{t('supporters.table.commission')}</th>
                      <th>{t('supporters.table.situation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((commission) => (
                      <tr key={commission.id}>
                        <td>{formatDateTime(commission.created_at, 'short')}</td>
                        <td>{commission.amount}</td>
                        <td><Status value={commission.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon={<Coins aria-hidden="true" />}>{t('supporters.commissionsEmpty')}</Empty>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
