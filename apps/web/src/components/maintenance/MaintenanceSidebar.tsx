import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, LogIn, AlertTriangle, Bug,
  LayoutGrid, Database, ShieldCheck, Download, Megaphone, Bell, ArrowLeft,
} from 'lucide-react';
import { useMaintenanceStore, type MaintenanceSection } from '@/stores/maintenance.store';

const NAV_ITEMS: Array<{
  id: MaintenanceSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'system-stats',   label: 'System Stats',       icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'users',          label: 'User Management',    icon: <Users className="h-4 w-4" /> },
  { id: 'announcements',  label: 'Announcements',      icon: <Bell className="h-4 w-4" /> },
  { id: 'login-logs',     label: 'Login Logs',          icon: <LogIn className="h-4 w-4" /> },
  { id: 'error-logs',     label: 'Error Logs',          icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'bug-reports',    label: 'Bug Reports',         icon: <Bug className="h-4 w-4" /> },
  { id: 'boards',         label: 'Board Overview',      icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'storage',        label: 'Storage Inspector',   icon: <Database className="h-4 w-4" /> },
  { id: 'sessions',       label: 'Session Management',  icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'export',         label: 'Data Export',         icon: <Download className="h-4 w-4" /> },
  { id: 'banner',         label: 'System Banner',       icon: <Megaphone className="h-4 w-4" /> },
];

export function MaintenanceSidebar() {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useMaintenanceStore();

  return (
    <aside className="w-56 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col h-full">
      <div className="px-4 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'⚔️'}</span>
          <div>
            <p className="text-xs font-bold text-[var(--color-primary)] leading-tight">QuestBoard</p>
            <p className="text-xs text-[var(--color-text-muted)]">Maintenance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-left transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-2">
        <button
          onClick={() => navigate('/boards')}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </button>
      </div>
    </aside>
  );
}
