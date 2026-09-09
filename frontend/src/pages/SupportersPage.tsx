import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Coins, TicketPercent } from "lucide-react";
import { programsApi } from "../services/api";
import { formatDate, formatDateTime } from "../lib/formatters";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { ProgramHeader } from "../components/programs/ProgramHeader";

export function SupportersPage() {
  const { t } = useTranslation("panel");
  const query = useQuery({
    queryKey: ["supporter"],
    queryFn: programsApi.supporter,
  });
  const action = useProgramAction();
  const data = query.data;
  const profile = data?.profile;
  return (
    <div className="program-page">
      <ProgramHeader
        eyebrow={t("supporters.eyebrow")}
        title={t("supporters.title")}
        description={t("supporters.description")}
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <div className="program-grid">
            <Card as="div" className="program-stat">
              <small>{t("supporters.available")}</small>
              <strong>{t("supporters.coins", { amount: Number(data.available).toFixed(2) })}</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>{t("supporters.share")}</small>
              <strong>{profile?.commission_percent || "0"}%</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>{t("supporters.registration")}</small>
              <div style={{ marginTop: 14 }}>
                {profile ? (
                  <Status value={profile.status} />
                ) : (
                  <span className="muted">{t("supporters.notSubmitted")}</span>
                )}
              </div>
            </Card>
          </div>
          <div className="program-two">
            <Card className="program-section">
              <h2>
                {profile
                  ? t("supporters.profileTitle")
                  : t("supporters.joinTitle")}
              </h2>
              {profile?.review_note && (
                <p className="program-note">
                  {t("supporters.reviewNote", { note: profile.review_note })}
                </p>
              )}
              <form
                key={profile?.id || "new"}
                className="program-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const file = form.get("image");
                  if (file instanceof File && !file.size) form.delete("image");
                  void action.run(
                    () => programsApi.apply(form),
                    t("supporters.applyToast"),
                    [["supporter"]],
                  );
                }}
              >
                {profile?.image && (
                  <img
                    src={profile.image}
                    className="program-avatar"
                    alt={profile.name}
                  />
                )}
                <label>
                  {t("supporters.nameLabel")}
                  <input
                    name="name"
                    defaultValue={profile?.name}
                    required
                    maxLength={100}
                    placeholder={t("supporters.namePlaceholder")}
                  />
                </label>
                <label>
                  {t("supporters.channelLabel")}
                  <input
                    name="channel_url"
                    defaultValue={profile?.channel_url}
                    type="url"
                    required
                    placeholder="https://…"
                  />
                </label>
                <label>
                  {t("supporters.aboutLabel")}
                  <textarea
                    name="description"
                    defaultValue={profile?.description}
                    maxLength={2000}
                    placeholder={t("supporters.aboutPlaceholder")}
                  />
                </label>
                <label>
                  {t("supporters.imageLabel")}
                  <input
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                  />
                </label>
                <div className="program-actions">
                  <Button disabled={action.busy} type="submit">
                    {action.busy
                      ? t("supporters.sending")
                      : profile
                        ? t("supporters.saveProfile")
                        : t("supporters.apply")}
                    <ArrowUpRight size={17} />
                  </Button>
                </div>
              </form>
            </Card>
            <div className="program-page">
              <Card className="program-section">
                <div className="program-section-heading">
                  <h2>{t("supporters.couponsTitle")}</h2>
                  <TicketPercent size={22} />
                </div>
                {data.coupons.length ? (
                  data.coupons.map((c) => (
                    <article className="program-item" key={c.code}>
                      <div className="program-section-heading">
                        <strong>{c.code}</strong>
                        <Status value={c.active ? "available" : "rejected"} />
                      </div>
                      <p>
                        {t("supporters.couponSummary", {
                          percent: c.percent,
                          uses: c.uses,
                        })}
                      </p>
                    </article>
                  ))
                ) : (
                  <Empty>{t("supporters.couponsEmpty")}</Empty>
                )}
              </Card>
              <Card className="program-section">
                <h2>{t("supporters.payoutTitle")}</h2>
                <p className="muted">{t("supporters.payoutDescription")}</p>
                <div className="program-actions">
                  <Button type="submit"

                    disabled={
                      action.busy ||
                      profile?.status !== "approved" ||
                      Number(data.available) <= 0
                    }
                    onClick={() =>
                      void action.run(
                        programsApi.payout,
                        t("supporters.payoutToast"),
                        [["supporter"]],
                      )
                    }
                  >
                    <Coins size={18} />
                    {t("supporters.payoutAction")}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          <Card className="program-section">
            <h2>{t("supporters.payoutsTitle")}</h2>
            {data.payouts.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>{t("supporters.table.date")}</th>
                      <th>{t("supporters.table.amount")}</th>
                      <th>{t("supporters.table.status")}</th>
                      <th>{t("supporters.table.note")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payouts.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.created_at)}</td>
                        <td>{p.amount}</td>
                        <td>
                          <Status value={p.status} />
                        </td>
                        <td>{p.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>{t("supporters.payoutsEmpty")}</Empty>
            )}
          </Card>
          <Card className="program-section">
            <h2>{t("supporters.commissionsTitle")}</h2>
            {data.commissions.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>{t("supporters.table.purchasedAt")}</th>
                      <th>{t("supporters.table.commission")}</th>
                      <th>{t("supporters.table.situation")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((c) => (
                      <tr key={c.id}>
                        <td>{formatDateTime(c.created_at, "short")}</td>
                        <td>{c.amount}</td>
                        <td>
                          <Status value={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>{t("supporters.commissionsEmpty")}</Empty>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
