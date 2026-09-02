import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "../services/domain/commerce.service";
import { Empty, ErrorNotice, Loading } from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { ProgramHeader } from "../components/programs/ProgramHeader";

export function ShopPage() {
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
    Number(v).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  async function change(row: CartLine, quantity: number) {
    key.current = null;
    if (row.kind === "item")
      await action.run(() =>
        quantity
          ? shopApi.updateCartItem(row.id, quantity)
          : shopApi.removeCartItem(row.id),
      );
    else {
      if (row.package_id)
        await action.run(() =>
          commerceApi.packageQuantity(row.package_id!, quantity),
        );
    }
  }
  return (
    <div className="program-page shop-page">
      <ProgramHeader
        eyebrow="Mercado do jogador"
        title="Loja do servidor"
        description="Itens, pacotes e vantagens para sua jornada. Suas compras são entregues na bag do painel."
      />
      <ErrorNotice
        error={catalog.error || packages.error || cart.error || action.error}
      />
      <div className="program-tabs" aria-label="Seções da loja">
        {[
          ["items", "Itens"],
          ["packages", "Pacotes"],
          ["history", "Minhas compras"],
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
          <h2>Histórico de compras</h2>
          <ErrorNotice error={purchases.error} />
          {purchases.isPending && <Loading />}
          {purchases.data?.map((p) => (
            <article className="program-item" key={p.id}>
              <div className="program-section-heading">
                <strong>
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </strong>
                <span>{money(p.total)} moedas</span>
              </div>
              <div className="program-rewards">
                {p.items.map((i, index) => (
                  <span className="program-reward" key={index}>
                    {i.quantity} × {i.name}
                  </span>
                ))}
              </div>
              <small>
                Desconto: {money(p.discount)} · Bônus utilizado:{" "}
                {money(p.bonus_used)}
                {p.promo_code ? ` · Cupom ${p.promo_code}` : ""}
              </small>
            </article>
          ))}
          {purchases.data?.length === 0 && (
            <Empty>
              Suas compras aparecerão aqui, com itens e valores preservados.
            </Empty>
          )}
        </Card>
      ) : (
        <div className="program-two">
          <Card className="program-section">
            <h2>
              {tab === "items" ? "Itens disponíveis" : "Pacotes especiais"}
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
                      <p>{item.quantity} unidades</p>
                      <strong>{money(item.price)} moedas</strong>
                    </div>
                    <Button type="submit"

                      disabled={action.busy}
                      onClick={() => {
                        key.current = null;
                        void action.run(
                          () => shopApi.addToCart(item.id),
                          "Item adicionado.",
                        );
                      }}
                    >
                      <Plus size={17} />
                      Adicionar
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
                            {i.grant_quantity} × {i.name}
                          </span>
                        </span>
                      ))}
                    </div>
                    <strong>{money(pack.total_price)} moedas</strong>
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
                          "Pacote adicionado.",
                        );
                      }}
                    >
                      <Plus size={17} />
                      Adicionar pacote
                    </Button>
                  </article>
                ))}
            </div>
            {(tab === "items" ? catalog.data : packages.data)?.length === 0 && (
              <Empty>Nenhum produto disponível nesta categoria.</Empty>
            )}
          </Card>
          <Card as="aside" className="program-section">
            <div className="program-section-heading">
              <h2>Seu carrinho</h2>
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
                    aria-label={`Diminuir ${row.name}`}
                    onClick={() => void change(row, row.quantity - 1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <span>{row.quantity}</span>
                  <Button type="submit"
                    className="ghost"
                    disabled={action.busy || row.quantity >= 99}
                    aria-label={`Aumentar ${row.name}`}
                    onClick={() => void change(row, row.quantity + 1)}
                  >
                    <Plus size={14} />
                  </Button>
                  <Button type="submit"
                    className="ghost"
                    disabled={action.busy}
                    aria-label={`Remover ${row.name}`}
                    onClick={() => void change(row, 0)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))}
            {cart.data?.items.length === 0 && (
              <Empty>Escolha itens ou pacotes para começar.</Empty>
            )}
            <form
              className="program-form"
              onSubmit={(e) => {
                e.preventDefault();
                key.current = null;
                void action.run(
                  () => commerceApi.options({ promo_code: coupon }),
                  "Cupom atualizado.",
                );
              }}
            >
              <label>
                Cupom de desconto
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  maxLength={40}
                  placeholder={cart.data?.promo_code || "Código promocional"}
                />
              </label>
              <div className="program-actions">
                <Button type="submit" className="ghost" disabled={action.busy}>
                  Aplicar cupom
                </Button>
                {cart.data?.promo_code && (
                  <Button
                    className="ghost"
                    type="button"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(() =>
                        commerceApi.options({ promo_code: "" }),
                      )
                    }
                  >
                    Remover {cart.data.promo_code}
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
                    void action.run(() =>
                      commerceApi.options({ use_bonus: e.target.checked }),
                    );
                  }}
                />
                Usar saldo bônus ({wallet.data?.bonus_balance || "0.00"})
              </label>
            </form>
            <div className="shop-cart-summary">
              <p>
                <span>Subtotal</span>
                <strong>{money(cart.data?.subtotal || 0)}</strong>
              </p>
              <p>
                <span>Desconto</span>
                <strong>− {money(cart.data?.discount || 0)}</strong>
              </p>
              <p>
                <span>Bônus utilizado</span>
                <strong>− {money(cart.data?.bonus_used || 0)}</strong>
              </p>
              <p className="shop-cart-total">
                <span>A pagar</span>
                <strong>{money(cart.data?.balance_due || 0)}</strong>
              </p>
              <small className="muted">
                Saldo disponível: {wallet.data?.balance || "0.00"} moedas
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
                    "Compra concluída! Itens entregues na bag.",
                  )
                  .then((ok) => {
                    if (ok) key.current = null;
                  });
              }}
            >
              <CheckCircle2 size={18} />{" "}
              {action.busy ? "Processando…" : "Finalizar compra"}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
