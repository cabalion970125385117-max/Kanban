import { MaintenanceSidebar } from '@/components/maintenance/MaintenanceSidebar';
import { SystemStatsSection } from '@/components/maintenance/SystemStatsSection';
import { UserManagementSection } from '@/components/maintenance/UserManagementSection';
import { AnnouncementsSection } from '@/components/maintenance/AnnouncementsSection';
import { LoginLogsSection } from '@/components/maintenance/LoginLogsSection';
import { ErrorLogsSection } from '@/components/maintenance/ErrorLogsSection';
import { BugReportsSection } from '@/components/maintenance/BugReportsSection';
import { BoardOverviewSection } from '@/components/maintenance/BoardOverviewSection';
import { StorageInspectorSection } from '@/components/maintenance/StorageInspectorSection';
import { SessionManagementSection } from '@/components/maintenance/SessionManagementSection';
import { DataExportSection } from '@/components/maintenance/DataExportSection';
import { MaintenanceBannerSection } from '@/components/maintenance/MaintenanceBannerSection';
import { useMaintenanceStore } from '@/stores/maintenance.store';

export function MaintenancePage() {
  const { activeSection } = useMaintenanceStore();

  return (
    <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
      <MaintenanceSidebar />

      <main className="flex-1 overflow-y-auto p-6">
        {activeSection === 'system-stats'   && <SystemStatsSection />}
        {activeSection === 'users'          && <UserManagementSection />}
        {activeSection === 'announcements'  && <AnnouncementsSection />}
        {activeSection === 'login-logs'    && <LoginLogsSection />}
        {activeSection === 'error-logs'    && <ErrorLogsSection />}
        {activeSection === 'bug-reports'   && <BugReportsSection />}
        {activeSection === 'boards'        && <BoardOverviewSection />}
        {activeSection === 'storage'       && <StorageInspectorSection />}
        {activeSection === 'sessions'      && <SessionManagementSection />}
        {activeSection === 'export'        && <DataExportSection />}
        {activeSection === 'banner'        && <MaintenanceBannerSection />}
      </main>
    </div>
  );
}
