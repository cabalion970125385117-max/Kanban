import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportAllData } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { APP_VERSION } from '@/constants/appVersion';

export function DataExportSection() {
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const payload = {
        exportedAt: new Date().toISOString(),
        version: APP_VERSION,
        data,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Data Export</h2>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 text-center">
        <div className="text-4xl mb-4">{'📦'}</div>
        <h3 className="font-semibold text-[var(--color-text)] mb-2">Export All Data</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
          Download a full JSON backup of all IndexedDB data — users, boards, cards, comments, and more.
          Use this for backups or migrating to a real backend.
        </p>
        <Button onClick={doExport} loading={exporting}>
          <Download className="h-4 w-4 mr-2" />
          Download Backup
        </Button>
      </div>
    </div>
  );
}
