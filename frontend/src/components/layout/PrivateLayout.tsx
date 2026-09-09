import { Button } from '../ui/Button'
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bell,
  CircleUserRound,
  Gamepad2,
  Gavel,
  LayoutDashboard,
  Headphones,
  MessageCircle,
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
import { notificationApi, supportApi, contentApi } from "../../services/api";
import { usePanelTheme } from "../../theme/usePanelTheme";
import { programsApi } from "../../services/api";
import { useTheme } from "../../theme/ThemeProvider";
import { ContextualHelp } from "../help/ContextualHelp";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { PdlSymbol } from "../PdlSymbol";

const links: Array<{
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}> = [
  { to: "/painel", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/painel/profile", labelKey: "nav.profile", icon: CircleUserRound },
  { to: "/painel/security", labelKey: "nav.security", icon: ShieldCheck },
  { to: "/painel/accounts", labelKey: "nav.accounts", icon: UserRoundCog },
  { to: "/painel/inventory", labelKey: "nav.inventory", icon: Package },
  { to: "/painel/wallet", labelKey: "nav.wallet", icon: WalletCards },
  { to: "/painel/shop", labelKey: "nav.shop", icon: ShoppingBag },
  { to: "/painel/marketplace", labelKey: "nav.marketplace", icon: Store },
  { to: "/painel/auctions", labelKey: "nav.auctions", icon: Gavel },
  { to: "/painel/games", labelKey: "nav.games", icon: Gamepad2 },
  { to: "/painel/recompensas", labelKey: "nav.rewards", icon: Gift },
  { to: "/painel/apoiadores", labelKey: "nav.supporters", icon: Handshake },
  { to: "/painel/progress", labelKey: "nav.progress", icon: Trophy },
  { to: "/painel/notifications", labelKey: "nav.notifications", icon: Bell },
  { to: "/painel/support", labelKey: "nav.support", icon: Headphones },
  { to: "/painel/ajuda", labelKey: "nav.help", icon: MessageCircle },
];

export function PrivateLayout() {
  const { t } = useTranslation("panel");
  const { t: tPublic } = useTranslation("public");
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: programsApi.resources,
    staleTime: 15000,
  });
  const codes: Record<string, string> = {
    profile: "profile",
    accounts: "accounts",
    wallet: "wallet",
    shop: "shop",
    inventory: "inventory",
    marketplace: "marketplace",
    auctions: "auction",
    games: "games",
    recompensas: "games",
    apoiadores: "supporters",
    progress: "progress",
    notifications: "notifications",
    support: "support",
    ajuda: "help",
  };
  const resourceEnabled = (code: string) =>
    !resources.data?.some((r) => r.code === code && !r.enabled);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isPortal = theme.presentation?.renderer === "portal-v1";
  const isAdmin = location.pathname.startsWith("/painel/admin");
  const shellCopy = isPortal
    ? (isAdmin ? theme.presentation?.shells?.admin : theme.presentation?.shells?.panel)
    : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const notices = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
    enabled: Boolean(user) && resourceEnabled("notifications"),
  });
  const unread = notices.data?.unread ?? 0;
  const support = useQuery({
    queryKey: ["support-tickets"],
    queryFn: supportApi.list,
    enabled: Boolean(user) && resourceEnabled("support"),
  });
  const pet = useQuery({
    queryKey: ["denkynho-pet", user?.id],
    queryFn: contentApi.denkynho,
    enabled: Boolean(user),
    staleTime: 15000,
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
    <div className={`panel-app${isPortal ? " portal-panel-shell" : ""}${isPortal && isAdmin ? " is-admin-shell" : ""}`} data-theme-renderer={theme.presentation?.renderer} data-theme-surface={isAdmin ? "admin" : "panel"}>
      <div className="shell">
        <aside className="sidebar">
          <div className="panel-brand">
            <PdlSymbol className="panel-brand-mark" />
            <div>
              <span className="panel-kicker">{shellCopy?.kicker ?? "Área do jogador"}</span>
              <div className="brand">{shellCopy?.brand ?? t("brand")}</div>
            </div>
          </div>
          <button
            className="panel-menu-toggle"
            type="button"
            aria-label={menuOpen ? tPublic("nav.closeMenu") : tPublic("nav.openMenu")}
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
              <span>{tPublic("nav.home")}</span>
            </NavLink>
            <div
              className="panel-menu"
              role="navigation"
              aria-label={t("brand")}
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
                      <span>{t(link.labelKey)}</span>
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
                  <span>{t("nav.admin")}</span>
                </NavLink>
              ) : null}
            </div>
            <div className="panel-user">
              <LanguageSwitcher className="language-switcher panel-language" id="panel-language" />
              {user ? (
                <div className="panel-user-account">
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
                  <Button
                    className="ghost"
                    type="button"
                    title="Sair da conta"
                    onClick={() => {
                      void logout().then(() => navigate("/"));
                    }}
                  >
                    <LogOut aria-hidden="true" />
                    <span>{t("nav.logout")}</span>
                  </Button>
                </div>
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
          {!location.pathname.startsWith("/painel/ajuda") ? (
            <ContextualHelp path={location.pathname} user={user} resources={resources.data} loading={resources.isPending} error={resources.error} pet={pet.data} />
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
