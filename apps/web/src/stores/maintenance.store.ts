import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MaintenanceSection =
  | 'system-stats'
  | 'users'
  | 'login-logs'
  | 'error-logs'
  | 'bug-reports'
  | 'boards'
  | 'storage'
  | 'sessions'
  | 'export'
  | 'banner'
  | 'announcements';

interface MaintenanceStore {
  activeSection: MaintenanceSection;
  setActiveSection: (section: MaintenanceSection) => void;
  bannerEnabled: boolean;
  bannerText: string;
  setBanner: (enabled: boolean, text: string) => void;
}

export const useMaintenanceStore = create<MaintenanceStore>()(
  persist(
    (set) => ({
      activeSection: 'system-stats',
      setActiveSection: (section) => set({ activeSection: section }),
      bannerEnabled: false,
      bannerText: '',
      setBanner: (enabled, text) => set({ bannerEnabled: enabled, bannerText: text }),
    }),
    { name: 'qb-maintenance' },
  ),
);
