import { Button } from '../ui/Button'
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CircleUserRound,
  Gamepad2,
  Gavel,
  LayoutDashboard,
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
  UserRoundCog,
  WalletCards,
  X,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLandingPath } from "../../hooks/useLandingPath";
import { canAccessStaff } from "../../lib/staff";
import { supportApi, contentApi } from "../../services/api";
import { usePanelTheme } from "../../theme/usePanelTheme";
import { programsApi } from "../../services/api";
import { useTheme } from "../../theme/ThemeProvider";
import { isPackagedRenderer } from "../../theme/renderers";
import { CONTEXTUAL_HELP_OUTLET_ID, ContextualHelp } from "../help/ContextualHelp";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { PdlSymbol } from "../PdlSymbol";
import { extensionNavItems, isExtensionResourceEnabled } from "../../extensions";

type PanelNavLink = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  /** Codes that must all be enabled; omit for always-visible items. */
  resources?: string[];
  /** Show the waiting-ticket badge on this item. */
  ticketBadge?: boolean;
};

const links: PanelNavLink[] = [
  { to: "/panel", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/panel/profile", labelKey: "nav.profile", icon: CircleUserRound, resources: ["profile"] },
  { to: "/panel/security", labelKey: "nav.security", icon: ShieldCheck },
  { to: "/panel/accounts", labelKey: "nav.accounts", icon: UserRoundCog, resources: ["accounts"] },
  { to: "/panel/inventory", labelKey: "nav.inventory", icon: Package, resources: ["inventory"] },
  { to: "/panel/wallet", labelKey: "nav.wallet", icon: WalletCards, resources: ["wallet"] },
  { to: "/panel/shop", labelKey: "nav.shop", icon: ShoppingBag, resources: ["shop"] },
  { to: "/panel/marketplace", labelKey: "nav.marketplace", icon: Store, resources: ["marketplace"] },
  { to: "/panel/auctions", labelKey: "nav.auctions", icon: Gavel, resources: ["auction"] },
  { to: "/panel/games", labelKey: "nav.games", icon: Gamepad2, resources: ["games"] },
  { to: "/panel/rewards", labelKey: "nav.rewards", icon: Gift, resources: ["games"] },
  { to: "/panel/supporters", labelKey: "nav.supporters", icon: Handshake, resources: ["supporters"] },
];

/** Ajuda no menu: Denkynho quando ativo; senão Atendimento no mesmo slot. */
function helpNavLink(helpOn: boolean, supportOn: boolean): PanelNavLink | null {
  if (helpOn) {
    return { to: "/panel/help", labelKey: "nav.help", icon: MessageCircle, ticketBadge: supportOn };
  }
  if (supportOn) {
    return { to: "/panel/support", labelKey: "nav.help", icon: MessageCircle, ticketBadge: true };
  }
  return null;
}

export function PrivateLayout() {
  const { t } = useTranslation("panel");
  const { t: tPublic } = useTranslation("public");
  const extensionPanelLinks = extensionNavItems("panel");
  const extensionStaffLinks = extensionNavItems("staff");
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: programsApi.resources,
    staleTime: 15000,
  });
  const resourceEnabled = (code: string) =>
    !resources.data?.some((r) => r.code === code && !r.enabled);
  const { user, logout } = useAuth();
  const landingPath = useLandingPath();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isPortal = isPackagedRenderer(theme.presentation?.renderer);
  const isAdmin = location.pathname.startsWith("/panel/admin");
  const shellCopy = isPortal
    ? (isAdmin ? theme.presentation?.shells?.admin : theme.presentation?.shells?.panel)
    : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const helpOn = resourceEnabled("help");
  const supportOn = resourceEnabled("support");
  const support = useQuery({
    queryKey: ["support-tickets"],
    queryFn: supportApi.list,
    enabled: Boolean(user) && supportOn,
  });
  const pet = useQuery({
    queryKey: ["denkynho-pet", user?.id],
    queryFn: contentApi.denkynho,
    enabled: Boolean(user) && helpOn,
    staleTime: 15000,
  });
  const waitingSupport = support.data?.summary.waiting_user ?? 0;
  const helpLink = helpNavLink(helpOn, supportOn);
  const panelLinks = [
    ...links.filter((link) => !link.resources?.some((code) => !resourceEnabled(code))),
    ...(helpLink ? [helpLink] : []),
  ];

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
              <span className="panel-kicker">{shellCopy?.kicker ?? t("shell.kicker")}</span>
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
            <span>{t("shell.menu")}</span>
          </button>
          <div
            className={`sidebar-drawer${menuOpen ? " is-open" : ""}`}
            id="panel-navigation-drawer"
          >
            <NavLink className="site-back" to={landingPath}>
              <ArrowLeft aria-hidden="true" />
              <span>{tPublic("nav.home")}</span>
            </NavLink>
            <div
              className="panel-menu"
              role="navigation"
              aria-label={t("brand")}
            >
              {panelLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink key={link.to} to={link.to} end={link.end}>
                      <Icon aria-hidden="true" />
                      <span>{t(link.labelKey)}</span>
                      {link.ticketBadge && waitingSupport ? (
                        <b className="menu-badge">{waitingSupport}</b>
                      ) : null}
                    </NavLink>
                  );
                })}
              {extensionPanelLinks
                .filter((link) => isExtensionResourceEnabled(resources.data, link.resource))
                .map((link) => (
                <NavLink key={link.to} to={link.to}>
                  <Puzzle aria-hidden="true" />
                  <span>{t(link.labelKey, { ns: link.ns })}</span>
                </NavLink>
              ))}
              {canAccessStaff(user) ? (
                <NavLink to="/panel/admin">
                  <SlidersHorizontal aria-hidden="true" />
                  <span>{t("nav.admin")}</span>
                </NavLink>
              ) : null}
              {canAccessStaff(user)
                ? extensionStaffLinks
                    .filter((link) => isExtensionResourceEnabled(resources.data, link.resource))
                    .map((link) => (
                    <NavLink key={link.to} to={link.to}>
                      <Puzzle aria-hidden="true" />
                      <span>{t(link.labelKey, { ns: link.ns })}</span>
                    </NavLink>
                  ))
                : null}
            </div>
            <div className="panel-user">
              <LanguageSwitcher className="language-switcher panel-language" id="panel-language" />
              {user ? (
                <div className="panel-user-account">
                  <NavLink
                    className="panel-user-avatar"
                    to="/panel/profile"
                    aria-label={t("shell.openProfile")}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <CircleUserRound />
                    )}
                  </NavLink>
                  <NavLink className="panel-user-copy" to="/panel/profile">
                    <strong>{user.display_name || user.username}</strong>
                    <span>
                      {user.is_email_verified
                        ? t("shell.verifiedAccount")
                        : t("shell.confirmEmail")}
                    </span>
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    title={t("shell.logoutTitle")}
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
          aria-label={tPublic("nav.closeMenu")}
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <header className="panel-topbar" data-theme-part="panel-topbar" aria-label={t("shell.topbar")}>
          <div className="panel-topbar-start">
            {helpOn && !location.pathname.startsWith("/panel/help") ? (
              <ContextualHelp path={location.pathname} user={user} resources={resources.data} loading={resources.isPending} error={resources.error} pet={pet.data} />
            ) : null}
          </div>
          {resourceEnabled("notifications") ? (
            <div className="panel-topbar-end">
              <NotificationCenter />
            </div>
          ) : null}
        </header>
        <main className="content">
          <div id={CONTEXTUAL_HELP_OUTLET_ID} className="panel-help-outlet" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
