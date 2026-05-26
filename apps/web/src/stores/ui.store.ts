import { create } from 'zustand';

interface UiStore {
  changelogOpen: boolean;
  openChangelog: () => void;
  closeChangelog: () => void;
  bugReportOpen: boolean;
  openBugReport: () => void;
  closeBugReport: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  changelogOpen: false,
  openChangelog: () => set({ changelogOpen: true }),
  closeChangelog: () => set({ changelogOpen: false }),
  bugReportOpen: false,
  openBugReport: () => set({ bugReportOpen: true }),
  closeBugReport: () => set({ bugReportOpen: false }),
}));
