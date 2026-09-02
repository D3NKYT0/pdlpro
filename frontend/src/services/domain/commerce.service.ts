import { request } from "../infra/http";
import { send } from "./programs.service";
export type ShopPackage = {
  id: string;
  name: string;
  total_price: string;
  active: boolean;
  contents: {
    item: string;
    item_id: number;
    name: string;
    quantity: number;
    grant_quantity: number;
  }[];
};
export type Promo = {
  id: string;
  code: string;
  percent: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number;
  uses: number;
  supporter: string | null;
};
export type CartLine = {
  id: string;
  kind: string;
  package_id?: string;
  name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  grants: { item_id: number; item_name: string; quantity: number }[];
};
export type Quote = {
  items: CartLine[];
  subtotal: string;
  discount: string;
  total: string;
  bonus_used: string;
  balance_due: string;
  promo_code: string;
  use_bonus: boolean;
};
export type Purchase = {
  id: string;
  total: string;
  subtotal: string;
  discount: string;
  bonus_used: string;
  promo_code: string;
  items: CartLine[];
  created_at: string;
};
export type ExchangeRequest = {
  request_key: string;
  direction: string;
  login: string;
  character_id: number;
  quantity: number;
};
export type Exchange = ExchangeRequest & {
  id: string;
  character_name: string;
  item_id: number;
  amount: string;
  fee: string;
  status: string;
  message: string;
  created_at: string;
};
export type ExchangeState = {
  enabled: boolean;
  unavailable_reason: string;
  coin: {
    name: string;
    item_id: number;
    multiplier: string;
    withdraw_fee_percent: string;
  } | null;
  history: Exchange[];
};
export const commerceApi = {
  packages: () => request<ShopPackage[]>("/shared/shop/commerce/packages/"),
  quote: () => request<Quote>("/shared/shop/commerce/quote/"),
  options: (data: { promo_code?: string; use_bonus?: boolean }) =>
    send<Quote>("/shared/shop/commerce/options/", data),
  packageQuantity: (package_id: string, quantity: number) =>
    send<Quote>("/shared/shop/commerce/packages/", { package_id, quantity }),
  purchases: () => request<Purchase[]>("/shared/shop/commerce/purchases/"),
  checkout: (request_key: string) =>
    send<{ purchase_id: string; total: string }>("/shared/shop/checkout/", {
      request_key,
    }),
  staffPackages: () => request<ShopPackage[]>("/staff/commerce/packages/"),
  staffPromos: () => request<Promo[]>("/staff/commerce/promos/"),
  save: (section: string, data: unknown, id?: string) =>
    send(
      `/staff/commerce/${section}/${id ? `${id}/` : ""}`,
      data,
      id ? "PATCH" : "POST",
    ),
  exchangeState: () => request<ExchangeState>("/shared/wallet/game-exchange/"),
  exchange: (data: ExchangeRequest) =>
    send<Exchange>("/shared/wallet/game-exchange/", data),
};
