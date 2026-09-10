import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { ItemIcon } from "../components/ItemIcon";
import { shopApi, walletApi } from "../services/api";
import {
  commerceApi,
  type CartLine,
} from "../services/api";
import { Empty, ErrorNotice, Loading } from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { ProgramHeader } from "../components/programs/ProgramHeader";
import { formatDateTime, formatNumber } from "../lib/formatters";

const SHOP_CART_KEYS = [["shop-quote"]] as const;
const SHOP_CHECKOUT_KEYS = [
  ["shop-quote"],
  ["shop-purchases"],
  ["wallet"],
] as const;

export function ShopPage() {
  const { t } = useTranslation("panel");
  const catalog = useQuery({ queryKey: ["shop"], queryFn: shopApi.catalog });
  const packages = useQuery({
    queryKey: ["shop-packages"],
    queryFn: commerceApi.packages,
  });
  const cart = useQuery({
    queryKey: ["shop-quote"],
    queryFn: commerceApi.quote,
  });
  const purchases = useQuery({
    queryKey: ["shop-purchases"],
    queryFn: commerceApi.purchases,
  });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: walletApi.me });
  const [tab, setTab] = useState("items");
  const [coupon, setCoupon] = useState("");
  const key = useRef<string | null>(null);
  const action = useProgramAction();
  const money = (v: string | number) =>
    formatNumber(v, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  async function change(row: CartLine, quantity: number) {
    key.current = null;
    if (row.kind === "item")
      await action.run(
        () =>
          quantity
            ? shopApi.updateCartItem(row.id, quantity)
            : shopApi.removeCartItem(row.id),
        t("shop.toast.cartUpdated"),
        SHOP_CART_KEYS,
      );
    else {
      if (row.package_id)
        await action.run(
          () => commerceApi.packageQuantity(row.package_id!, quantity),
          t("shop.toast.cartUpdated"),
          SHOP_CART_KEYS,
        );
    }
  }
  return (
    <div className="program-page shop-page">
      <ProgramHeader
        eyebrow={t("shop.eyebrow")}
        title={t("shop.title")}
        description={t("shop.description")}
      />
      <ErrorNotice
        error={catalog.error || packages.error || cart.error || action.error}
      />
      <div className="program-tabs" aria-label={t("shop.tabsLabel")}>
        {[
          ["items", t("shop.tabs.items")],
          ["packages", t("shop.tabs.packages")],
          ["history", t("shop.tabs.history")],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "history" ? (
        <Card className="program-section">
          <h2>{t("shop.history.title")}</h2>
          <ErrorNotice error={purchases.error} />
          {purchases.isPending && <Loading />}
          {purchases.data?.map((p) => (
            <article className="program-item" key={p.id}>
              <div className="program-section-heading">
                <strong>
                  {formatDateTime(p.created_at)}
                </strong>
                <span>{t("shop.coins", { value: money(p.total) })}</span>
              </div>
              <div className="program-rewards">
                {p.items.map((i, index) => (
                  <span className="program-reward" key={index}>
                    {t("shop.history.itemLine", { quantity: i.quantity, name: i.name })}
                  </span>
                ))}
              </div>
              <small>
                {t("shop.history.summary", {
                  discount: money(p.discount),
                  bonus: money(p.bonus_used),
                })}
                {p.promo_code ? t("shop.history.coupon", { code: p.promo_code }) : ""}
              </small>
            </article>
          ))}
          {purchases.data?.length === 0 && (
            <Empty>
              {t("shop.history.empty")}
            </Empty>
          )}
        </Card>
      ) : (
        <div className="program-two">
          <Card className="program-section">
            <h2>
              {tab === "items" ? t("shop.catalog.itemsTitle") : t("shop.catalog.packagesTitle")}
            </h2>
            {(catalog.isPending || packages.isPending) && <Loading />}
            <div className="shop-product-grid">
              {tab === "items" &&
                catalog.data?.map((item) => (
                  <article className="shop-product" key={item.id}>
                    <ItemIcon
                      itemId={item.item_id}
                      name={item.name}
                      size={48}
                    />
                    <div className="shop-product-info">
                      <h3>{item.name}</h3>
                      <p>{t("shop.catalog.units", { quantity: item.quantity })}</p>
                      <strong>{t("shop.coins", { value: money(item.price) })}</strong>
                    </div>
                    <Button type="submit"

                      disabled={action.busy}
                      onClick={() => {
                        key.current = null;
                        void action.run(
                          () => shopApi.addToCart(item.id),
                          t("shop.toast.itemAdded"),
                          SHOP_CART_KEYS,
                        );
                      }}
                    >
                      <Plus size={17} />
                      {t("shop.catalog.add")}
                    </Button>
                  </article>
                ))}
              {tab === "packages" &&
                packages.data?.map((pack) => (
                  <article className="program-item" key={pack.id}>
                    <Package color="var(--gold)" size={32} />
                    <h3>{pack.name}</h3>
                    <div className="program-rewards">
                      {pack.contents.map((i, index) => (
                        <span className="program-reward" key={index}>
                          <ItemIcon itemId={i.item_id} size={28} />
                          <span>
                            {t("shop.catalog.packLine", { quantity: i.grant_quantity, name: i.name })}
                          </span>
                        </span>
                      ))}
                    </div>
                    <strong>{t("shop.coins", { value: money(pack.total_price) })}</strong>
                    <Button type="submit"

                      disabled={action.busy || !pack.contents.length}
                      onClick={() => {
                        key.current = null;
                        void action.run(
                          () =>
                            commerceApi.packageQuantity(
                              pack.id,
                              Math.min(
                                99,
                                (cart.data?.items.find(
                                  (row) => row.package_id === pack.id,
                                )?.quantity || 0) + 1,
                              ),
                            ),
                          t("shop.toast.packageAdded"),
                          SHOP_CART_KEYS,
                        );
                      }}
                    >
                      <Plus size={17} />
                      {t("shop.catalog.addPackage")}
                    </Button>
                  </article>
                ))}
            </div>
            {(tab === "items" ? catalog.data : packages.data)?.length === 0 && (
              <Empty>{t("shop.catalog.empty")}</Empty>
            )}
          </Card>
          <Card as="aside" className="program-section">
            <div className="program-section-heading">
              <h2>{t("shop.cart.title")}</h2>
              <ShoppingCart color="var(--gold)" />
            </div>
            {cart.isPending && <Loading />}
            {cart.data?.items.map((row) => (
              <article className="program-item" key={row.id}>
                <div className="program-section-heading">
                  <strong>{row.name}</strong>
                  <span>{money(row.line_total)}</span>
                </div>
                <div className="program-actions">
                  <Button type="submit"
                    className="ghost"
                    disabled={action.busy}
                    aria-label={t("shop.cart.decrease", { name: row.name })}
                    onClick={() => void change(row, row.quantity - 1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <span>{row.quantity}</span>
                  <Button type="submit"
                    className="ghost"
                    disabled={action.busy || row.quantity >= 99}
                    aria-label={t("shop.cart.increase", { name: row.name })}
                    onClick={() => void change(row, row.quantity + 1)}
                  >
                    <Plus size={14} />
                  </Button>
                  <Button type="submit"
                    className="ghost"
                    disabled={action.busy}
                    aria-label={t("shop.cart.remove", { name: row.name })}
                    onClick={() => void change(row, 0)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))}
            {cart.data?.items.length === 0 && (
              <Empty>{t("shop.cart.empty")}</Empty>
            )}
            <form
              className="program-form"
              onSubmit={(e) => {
                e.preventDefault();
                key.current = null;
                void action.run(
                  () => commerceApi.options({ promo_code: coupon }),
                  t("shop.toast.couponUpdated"),
                  SHOP_CART_KEYS,
                );
              }}
            >
              <label>
                {t("shop.cart.coupon")}
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  maxLength={40}
                  placeholder={cart.data?.promo_code || t("shop.cart.couponPlaceholder")}
                />
              </label>
              <div className="program-actions">
                <Button type="submit" className="ghost" disabled={action.busy}>
                  {t("shop.cart.applyCoupon")}
                </Button>
                {cart.data?.promo_code && (
                  <Button
                    className="ghost"
                    type="button"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () => commerceApi.options({ promo_code: "" }),
                        t("shop.toast.couponRemoved"),
                        SHOP_CART_KEYS,
                      )
                    }
                  >
                    {t("shop.cart.removeCoupon", { code: cart.data.promo_code })}
                  </Button>
                )}
              </div>
              <label className="program-check">
                <input
                  type="checkbox"
                  checked={cart.data?.use_bonus || false}
                  disabled={action.busy}
                  onChange={(e) => {
                    key.current = null;
                    void action.run(
                      () =>
                        commerceApi.options({ use_bonus: e.target.checked }),
                      t("shop.toast.bonusUpdated"),
                      SHOP_CART_KEYS,
                    );
                  }}
                />
                {t("shop.cart.useBonus", { balance: wallet.data?.bonus_balance || "0.00" })}
              </label>
            </form>
            <div className="shop-cart-summary">
              <p>
                <span>{t("shop.cart.subtotal")}</span>
                <strong>{money(cart.data?.subtotal || 0)}</strong>
              </p>
              <p>
                <span>{t("shop.cart.discount")}</span>
                <strong>− {money(cart.data?.discount || 0)}</strong>
              </p>
              <p>
                <span>{t("shop.cart.bonusUsed")}</span>
                <strong>− {money(cart.data?.bonus_used || 0)}</strong>
              </p>
              <p className="shop-cart-total">
                <span>{t("shop.cart.due")}</span>
                <strong>{money(cart.data?.balance_due || 0)}</strong>
              </p>
              <small className="muted">
                {t("shop.cart.availableBalance", { balance: wallet.data?.balance || "0.00" })}
              </small>
            </div>
            <Button type="submit"

              disabled={
                action.busy ||
                !cart.data?.items.length ||
                Number(cart.data.balance_due) >
                  Number(wallet.data?.balance || 0)
              }
              onClick={() => {
                key.current ||= crypto.randomUUID();
                void action
                  .run(
                    () => commerceApi.checkout(key.current!),
                    t("shop.toast.checkoutDone"),
                    SHOP_CHECKOUT_KEYS,
                  )
                  .then((ok) => {
                    if (ok) key.current = null;
                  });
              }}
            >
              <CheckCircle2 size={18} />{" "}
              {action.busy ? t("shop.cart.processing") : t("shop.cart.checkout")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
