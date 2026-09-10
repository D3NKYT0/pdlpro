import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  commerceApi,
  programsApi,
  shopApi,
  type Promo,
  type ShopPackage,
} from "../../services/api";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../../components/programs/ProgramUI";
import { useProgramAction } from "../../components/programs/useProgramAction";
import { AdminHeader } from "./AdminChrome";

export function AdminCommercePage() {
  const { t } = useTranslation("admin");
  const packs = useQuery({
    queryKey: ["staff-packages"],
    queryFn: commerceApi.staffPackages,
  });
  const promos = useQuery({
    queryKey: ["staff-promos"],
    queryFn: commerceApi.staffPromos,
  });
  const items = useQuery({ queryKey: ["shop"], queryFn: shopApi.catalog });
  const supporters = useQuery({
    queryKey: ["staff-supporters"],
    queryFn: programsApi.staffSupporters,
  });
  const action = useProgramAction();
  const [tab, setTab] = useState("packages");
  const [draft, setDraft] = useState<Partial<ShopPackage & Promo> | null>(null);
  const [contents, setContents] = useState<
    { item: string; quantity: number }[]
  >([]);
  const packages = tab === "packages";
  function open(row?: ShopPackage | Promo) {
    setDraft(row || {});
    setContents(
      row && "contents" in row
        ? row.contents.map((c) => ({ item: c.item, quantity: c.quantity }))
        : [],
    );
  }
  return (
    <div className="program-page">
      <AdminHeader
        kicker={t("commerce.kicker")}
        title={t("commerce.title")}
        description={t("commerce.description")}
      />
      <ErrorNotice error={packs.error || promos.error || action.error} />
      <div className="program-tabs">
        {[
          ["packages", t("commerce.tabPackages")],
          ["promos", t("commerce.tabPromos")],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setDraft(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="program-actions">
        <Button type="submit" onClick={() => open()}>
          <Plus size={18} />
          {packages ? t("commerce.createPackage") : t("commerce.createPromo")}
        </Button>
      </div>
      {draft && (
        <Card className="program-section">
          <h2>
            {packages
              ? draft.id
                ? t("commerce.editPackage")
                : t("commerce.newPackage")
              : draft.id
                ? t("commerce.editPromo")
                : t("commerce.newPromo")}
          </h2>
          <form
            key={draft.id || tab}
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data = packages
                ? {
                    name: f.get("name"),
                    total_price: f.get("total_price"),
                    active: f.has("active"),
                    items: contents,
                  }
                : {
                    code: f.get("code"),
                    percent: f.get("percent"),
                    active: f.has("active"),
                    starts_at: f.get("starts_at")
                      ? new Date(String(f.get("starts_at"))).toISOString()
                      : null,
                    ends_at: f.get("ends_at")
                      ? new Date(String(f.get("ends_at"))).toISOString()
                      : null,
                    max_uses: Number(f.get("max_uses")),
                    supporter: f.get("supporter") || null,
                  };
              void action
                .run(
                  () => commerceApi.save(tab, data, draft.id),
                  packages
                    ? t("commerce.packageSaved")
                    : t("commerce.promoSaved"),
                  packages
                    ? [["staff-packages"], ["shop-packages"]]
                    : [["staff-promos"]],
                )
                .then((ok) => {
                  if (ok) setDraft(null);
                });
            }}
          >
            {packages ? (
              <>
                <div className="program-fields">
                  <label>
                    {t("commerce.packageName")}
                    <input name="name" required defaultValue={draft.name} />
                  </label>
                  <label>
                    {t("commerce.priceCoins")}
                    <input
                      name="total_price"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      defaultValue={draft.total_price}
                    />
                  </label>
                </div>
                <h3>{t("commerce.packageContents")}</h3>
                {contents.map((c, i) => (
                  <div className="program-fields" key={i}>
                    <label>
                      {t("commerce.item")}
                      <select
                        required
                        value={c.item}
                        onChange={(e) =>
                          setContents(
                            contents.map((r, j) =>
                              j === i ? { ...r, item: e.target.value } : r,
                            ),
                          )
                        }
                      >
                        <option value="">{t("commerce.selectItem")}</option>
                        {items.data?.map((item) => (
                          <option key={item.id} value={item.id}>
                            {t("commerce.itemOption", {
                              name: item.name,
                              quantity: item.quantity,
                            })}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("commerce.quantity")}
                      <input
                        type="number"
                        min={1}
                        required
                        value={c.quantity}
                        onChange={(e) =>
                          setContents(
                            contents.map((r, j) =>
                              j === i
                                ? { ...r, quantity: Number(e.target.value) }
                                : r,
                            ),
                          )
                        }
                      />
                    </label>
                    <Button
                      className="ghost"
                      type="button"
                      onClick={() =>
                        setContents(contents.filter((_, j) => i !== j))
                      }
                    >
                      <Trash2 size={14} />
                      {t("commerce.removeItem")}
                    </Button>
                  </div>
                ))}
                <div className="program-actions">
                  <Button
                    className="ghost"
                    type="button"
                    onClick={() =>
                      setContents([...contents, { item: "", quantity: 1 }])
                    }
                  >
                    <Plus size={16} />
                    {t("commerce.addItem")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="program-fields">
                <label>
                  {t("commerce.code")}
                  <input
                    name="code"
                    required
                    maxLength={40}
                    defaultValue={draft.code}
                  />
                </label>
                <label>
                  {t("commerce.discount")}
                  <input
                    name="percent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    required
                    defaultValue={draft.percent || 10}
                  />
                </label>
                <label>
                  {t("commerce.startsAt")}
                  <input
                    type="datetime-local"
                    name="starts_at"
                    defaultValue={dateValue(draft.starts_at)}
                  />
                </label>
                <label>
                  {t("commerce.endsAt")}
                  <input
                    type="datetime-local"
                    name="ends_at"
                    defaultValue={dateValue(draft.ends_at)}
                  />
                </label>
                <label>
                  {t("commerce.maxUses")}
                  <input
                    name="max_uses"
                    type="number"
                    min={0}
                    defaultValue={draft.max_uses || 0}
                  />
                </label>
                <label>
                  {t("commerce.supporter")}
                  <select name="supporter" defaultValue={draft.supporter || ""}>
                    <option value="">{t("commerce.noSupporter")}</option>
                    {supporters.data?.supporters
                      .filter((s) => s.status === "approved")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}
            <label className="program-check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={draft.active ?? true}
              />
              {t("commerce.active")}
            </label>
            <div className="program-actions">
              <Button type="submit"

                disabled={action.busy || (packages && !contents.length)}
              >
                {t("commerce.save")}
              </Button>
              <Button
                type="button"
                className="ghost"
                onClick={() => setDraft(null)}
              >
                {t("commerce.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {(packs.isPending || promos.isPending) && <Loading />}
      <div className="program-grid">
        {packages
          ? packs.data?.map((p) => (
              <Card as="article" className="program-section" key={p.id}>
                <div className="program-section-heading">
                  <h2>{p.name}</h2>
                  <Status value={p.active ? "available" : "rejected"} />
                </div>
                <strong>
                  {t("commerce.packagePrice", { price: p.total_price })}
                </strong>
                {p.contents.map((c, i) => (
                  <small className="muted" key={i}>
                    {t("commerce.packageLine", {
                      quantity: c.grant_quantity,
                      name: c.name,
                    })}
                  </small>
                ))}
                <div className="program-actions">
                  <Button type="submit" className="ghost" onClick={() => open(p)}>
                    <Pencil size={16} />
                    {t("commerce.editPackage")}
                  </Button>
                </div>
              </Card>
            ))
          : promos.data?.map((p) => (
              <Card as="article" className="program-section" key={p.id}>
                <div className="program-section-heading">
                  <h2>{p.code}</h2>
                  <Status value={p.active ? "available" : "rejected"} />
                </div>
                <strong>
                  {t("commerce.promoDiscount", { percent: p.percent })}
                </strong>
                <small className="muted">
                  {t("commerce.promoUses", {
                    uses: p.uses,
                    limit: p.max_uses || t("commerce.unlimited"),
                  })}
                </small>
                <div className="program-actions">
                  <Button type="submit" className="ghost" onClick={() => open(p)}>
                    <Pencil size={16} />
                    {t("commerce.editPromo")}
                  </Button>
                </div>
              </Card>
            ))}
      </div>
      {(packages ? packs.data : promos.data)?.length === 0 && (
        <Empty>{t("commerce.empty")}</Empty>
      )}
    </div>
  );
}
function dateValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
