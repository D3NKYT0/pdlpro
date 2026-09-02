import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  CircleUserRound,
  Gamepad2,
  Gavel,
  LayoutDashboard,
  Headphones,
  Handshake,
  Gift,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trophy,
  UserRoundCog,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { canAccessStaff } from "../../lib/staff";
import { notificationApi, supportApi } from "../../services/api";
import { themeImage } from "../../theme/assets";
import { usePanelTheme } from "../../theme/usePanelTheme";
import { programsApi } from "../../services/domain/programs.service";

const links: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}> = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/painel/profile", label: "Meu perfil", icon: CircleUserRound },
  { to: "/painel/security", label: "Conta e segurança", icon: ShieldCheck },
  { to: "/painel/accounts", label: "Conta L2", icon: UserRoundCog },
  { to: "/painel/inventory", label: "Inventário", icon: Package },
  { to: "/painel/wallet", label: "Carteira", icon: WalletCards },
  { to: "/painel/shop", label: "Loja", icon: ShoppingBag },
  { to: "/painel/marketplace", label: "Marketplace", icon: Store },
  { to: "/painel/auctions", label: "Leilão", icon: Gavel },
  { to: "/painel/games", label: "Jogos", icon: Gamepad2 },
  { to: "/painel/recompensas", label: "Jornada e recompensas", icon: Gift },
  { to: "/painel/apoiadores", label: "Apoiadores", icon: Handshake },
  { to: "/painel/progress", label: "Progresso", icon: Trophy },
  { to: "/painel/notifications", label: "Avisos", icon: Bell },
  { to: "/painel/support", label: "Atendimento", icon: Headphones },
];

export function PrivateLayout() {
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: programsApi.resources,
    staleTime: 15000,
  });
  const codes: Record<string, string> = {
    wallet: "wallet",
    shop: "shop",
    inventory: "inventory",
    marketplace: "marketplace",
    auctions: "auction",
    games: "games",
    recompensas: "games",
    apoiadores: "supporters",
  };
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const notices = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
    enabled: Boolean(user),
  });
  const unread = notices.data?.unread ?? 0;
  const support = useQuery({
    queryKey: ["support-tickets"],
    queryFn: supportApi.list,
    enabled: Boolean(user),
  });
  const waitingSupport = support.data?.summary.waiting_user ?? 0;

  usePanelTheme();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="panel-app">
      <div className="shell">
        <aside className="sidebar">
          <div className="panel-brand">
            <img
              className="panel-brand-mark"
              src={themeImage("logo-circle.png")}
              alt=""
            />
            <div>
              <span className="panel-kicker">Área do jogador</span>
              <div className="brand">Painel</div>
            </div>
          </div>
          <button
            className="panel-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="panel-navigation-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span>Menu</span>
          </button>
          <div
            className={`sidebar-drawer${menuOpen ? " is-open" : ""}`}
            id="panel-navigation-drawer"
          >
            <NavLink className="site-back" to="/">
              <ArrowLeft aria-hidden="true" />
              <span>Voltar ao site</span>
            </NavLink>
            <div
              className="panel-menu"
              role="navigation"
              aria-label="Navegação da área do jogador"
            >
              {links
                .filter(
                  (link) =>
                    !resources.data?.some(
                      (r) =>
                        r.code === codes[link.to.split("/").pop() || ""] &&
                        !r.enabled,
                    ),
                )
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink key={link.to} to={link.to} end={link.end}>
                      <Icon aria-hidden="true" />
                      <span>{link.label}</span>
                      {link.to === "/painel/notifications" && unread ? (
                        <b className="menu-badge">{unread}</b>
                      ) : null}
                      {link.to === "/painel/support" && waitingSupport ? (
                        <b className="menu-badge">{waitingSupport}</b>
                      ) : null}
                    </NavLink>
                  );
                })}
              {canAccessStaff(user) ? (
                <NavLink to="/painel/admin">
                  <SlidersHorizontal aria-hidden="true" />
                  <span>Admin</span>
                </NavLink>
              ) : null}
            </div>
            <div className="panel-user">
              {user ? (
                <>
                  <NavLink
                    className="panel-user-avatar"
                    to="/painel/profile"
                    aria-label="Abrir meu perfil"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <CircleUserRound />
                    )}
                  </NavLink>
                  <NavLink className="panel-user-copy" to="/painel/profile">
                    <strong>{user.display_name || user.username}</strong>
                    <span>
                      {user.is_email_verified
                        ? "Conta verificada"
                        : "Confirme seu e-mail"}
                    </span>
                  </NavLink>
                  <button
                    className="btn ghost"
                    type="button"
                    title="Sair da conta"
                    onClick={() => {
                      void logout().then(() => navigate("/"));
                    }}
                  >
                    <LogOut aria-hidden="true" />
                    <span>Sair</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </aside>
        <button
          className={`panel-menu-backdrop${menuOpen ? " is-open" : ""}`}
          type="button"
          aria-label="Fechar menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
