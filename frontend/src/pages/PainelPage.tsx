import { AchievementGrid } from '../components/AchievementGrid'
import { DashboardHero } from '../components/dashboard/DashboardHero'
import { DashboardRoster } from '../components/dashboard/DashboardRoster'
import { DashboardShortcuts } from '../components/dashboard/DashboardShortcuts'
import { DashboardSummary } from '../components/dashboard/DashboardSummary'
import { usePanelDashboard } from '../components/dashboard/usePanelDashboard'
import { AccountProgress } from '../components/progress/AccountProgress'
import { ExtensionSlotOutlet } from '../extensions'

export function PainelPage() {
  const dash = usePanelDashboard()

  return (
    <div className="grid panel-dashboard">
      <DashboardHero user={dash.user} status={dash.status} gamesEnabled={dash.gamesEnabled} />
      <DashboardSummary
        user={dash.user}
        progress={dash.progress}
        progressEnabled={dash.progressEnabled}
        wallet={dash.wallet}
        walletEnabled={dash.walletEnabled}
        accountsCount={dash.accountsCount}
        accountsEnabled={dash.accountsEnabled}
        rosterTotal={dash.rosterTotal}
        bagCount={dash.bagCount}
        gamesEnabled={dash.gamesEnabled}
      />
      {dash.accountsEnabled ? (
        <DashboardRoster login={dash.selectedLogin} characters={dash.roster} pending={dash.accountsPending} />
      ) : null}
      {dash.progressEnabled ? <AccountProgress profile={dash.progress} /> : null}
      {dash.progressEnabled ? (
        <AchievementGrid achievements={dash.progress?.achievements ?? []} showRewardsLink={false} />
      ) : null}
      <DashboardShortcuts items={dash.dashboardShortcuts} />
      <ExtensionSlotOutlet slot="panel.dashboard" />
    </div>
  )
}
