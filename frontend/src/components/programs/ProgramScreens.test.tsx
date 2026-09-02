import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ResourceGate } from "./ResourceGate";
import { RewardsEditor } from "./RewardsEditor";
import { RewardList, Status } from "./ProgramUI";
import { ShopPage } from "../../pages/ShopPage";
import { GameExchangePage } from "../../pages/GameExchangePage";
import { AdminResourcesPage } from "../../pages/admin/AdminProgramsPage";
import { ProgramHeader } from "./ProgramHeader";

function render(node: ReactNode, cache: [unknown[], unknown][] = []) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.forEach(([key, value]) => client.setQueryData(key, value));
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>{node}</MemoryRouter>
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}
const resource = {
  id: "test",
  code: "shop",
  name: "Loja",
  category: "Economia",
  enabled: false,
  description: "Itens e pacotes",
};

describe("program screens", () => {
  it.each(["Loja do servidor", "Jornada e recompensas", "Programa de apoiadores"])(
    "renders %s with a restrained text-only header",
    (title) => {
      const html = render(<ProgramHeader eyebrow="Área do jogador" title={title} description="Descrição da página." />);
      expect(html).toContain("program-hero--editorial");
      expect(html).toContain(`<h1>${title}</h1>`);
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("<img");
    },
  );
  it("hides disabled modules rather than rendering protected content", () => {
    const html = render(
      <ResourceGate code="shop">
        <div>secret-shop</div>
      </ResourceGate>,
      [[["resources"], [resource]]],
    );
    expect(html).toContain("Recurso temporariamente desativado");
    expect(html).not.toContain("secret-shop");
  });
  it("renders enabled module content", () => {
    expect(
      render(<ResourceGate code="shop">open-shop</ResourceGate>, [
        [["resources"], [{ ...resource, enabled: true }]],
      ]),
    ).toContain("open-shop");
  });
  it("exposes accessible resource switches with the persisted state", () => {
    const html = render(<AdminResourcesPage />, [[["resources"], [resource]]]);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Ativar Loja"');
  });
  it("provides structured reward fields and preserves enchantment", () => {
    const html = render(
      <RewardsEditor
        value={[
          { kind: "item", item_id: 57, name: "Adena", quantity: 5, enchant: 3 },
        ]}
        onChange={() => {}}
      />,
    );
    expect(html).toContain("Encantamento");
    expect(html).toContain('value="3"');
    expect(html).toContain("Remover recompensa");
    expect(html).not.toContain("<textarea");
  });
  it("distinguishes money, bonus and tokens with localized status", () => {
    const html = render(
      <>
        <RewardList
          rewards={[
            { kind: "balance", quantity: 10 },
            { kind: "bonus", quantity: 5 },
            { kind: "tokens", quantity: 2 },
          ]}
        />
        <Status value="paid" />
      </>,
    );
    for (const text of ["Saldo", "Bônus", "Fichas", "Creditado"])
      expect(html).toContain(text);
  });
  it("renders package cart totals, coupon and bonus explicitly", () => {
    const html = render(<ShopPage />, [
      [["shop"], []],
      [["shop-packages"], []],
      [["shop-purchases"], []],
      [["wallet"], { balance: "90.00", bonus_balance: "10.00" }],
      [
        ["shop-quote"],
        {
          items: [
            {
              id: "line",
              kind: "package",
              package_id: "package",
              name: "Kit especial",
              quantity: 2,
              unit_price: "20.00",
              line_total: "40.00",
              grants: [],
            },
          ],
          subtotal: "40.00",
          discount: "4.00",
          total: "36.00",
          bonus_used: "10.00",
          balance_due: "26.00",
          promo_code: "TEST10",
          use_bonus: true,
        },
      ],
    ]);
    for (const text of [
      "Kit especial",
      "26,00",
      "TEST10",
      "Bônus utilizado",
      "Finalizar compra",
    ])
      expect(html).toContain(text);
    expect(html).toContain("Aumentar Kit especial");
  });
  it("disables exchange until the real game integration is ready", () => {
    const html = render(<GameExchangePage />, [
      [
        ["game-exchange"],
        {
          enabled: false,
          unavailable_reason: "Recibos não preparados",
          coin: null,
          history: [],
        },
      ],
      [["lineage-accounts"], { accounts: [] }],
    ]);
    expect(html).toContain("Recibos não preparados");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Revisar transferência/);
    expect(html).toContain("Saldo bônus não é transferível");
  });
});
