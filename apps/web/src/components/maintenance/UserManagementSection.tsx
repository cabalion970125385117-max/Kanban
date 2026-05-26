import { Fragment, useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, KeyRound, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllUsers,
  adminUpdateUser,
  adminCreateUser,
  adminResetPassword,
  deleteUserCascade,
} from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserRow } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';

const ROLES: UserRow['role'][] = ['admin', 'maintenance', 'member', 'guest'];
const STATUS_OPTS: UserRow['status'][] = ['active', 'inactive', 'suspended'];

const STATUS_COLORS: Record<UserRow['status'], string> = {
  active: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  inactive: 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]',
  suspended: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
};

function DeleteModal({
  user,
  onConfirm,
  onCancel,
}: {
  user: UserRow;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const matches = confirmText === user.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 w-full max-w-md mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-text)]">Delete Account</h3>
            <p className="text-xs text-[var(--color-text-muted)]">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text)]">
          This will permanently delete <span className="font-semibold">{user.name}</span> along
          with all their boards, columns, cards, and associated data.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Type <span className="font-mono font-bold">{user.name}</span> to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={user.name}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && matches) onConfirm(); if (e.key === 'Escape') onCancel(); }}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            disabled={!matches}
            onClick={onConfirm}
            className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white disabled:opacity-40"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementSection() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'member' as UserRow['role'] });
  const [revealHashId, setRevealHashId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const load = async () => setUsers(await getAllUsers());
  useEffect(() => { load(); }, []);

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await adminUpdateUser(id, { name: editName.trim() });
    toast.success('Name updated');
    setEditId(null);
    await load();
  };

  const changeRole = async (id: string, role: UserRow['role']) => {
    await adminUpdateUser(id, { role });
    toast.success('Role updated');
    await load();
  };

  const changeStatus = async (id: string, status: UserRow['status']) => {
    await adminUpdateUser(id, { status });
    toast.success('Status updated');
    await load();
  };

  const doResetPassword = async (id: string) => {
    if (!resetPw.trim()) return;
    await adminResetPassword(id, resetPw);
    toast.success('Password reset');
    setResetId(null);
    setResetPw('');
  };

  const doDeleteCascade = async (user: UserRow) => {
    if (user.id === me?.id) { toast.error('Cannot delete your own account'); return; }
    await deleteUserCascade(user.id);
    toast.success(`${user.name} and all their data deleted`);
    setDeleteTarget(null);
    await load();
  };

  const createUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      toast.error('All fields are required');
      return;
    }
    try {
      await adminCreateUser(newUser);
      toast.success('User created');
      setCreating(false);
      setNewUser({ name: '', email: '', password: '', role: 'member' });
      await load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to create user');
    }
  };

  return (
    <div>
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={() => doDeleteCascade(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">User Management</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add User
        </Button>
      </div>

      {creating && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium text-sm text-[var(--color-text)]">New user</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
            <select
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRow['role'] }))}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createUser}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Password</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr className="hover:bg-[var(--color-bg)]/50">
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 text-xs"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(u.id); if (e.key === 'Escape') setEditId(null); }}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(u.id)} className="text-[var(--color-success)]"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditId(null)} className="text-[var(--color-text-muted)]"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <span className="font-medium text-[var(--color-text)]">{u.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono text-[var(--color-text-muted)] max-w-[120px] truncate">
                        {revealHashId === u.id
                          ? u.password_hash.slice(0, 32) + '…'
                          : '••••••••'}
                      </code>
                      <button
                        type="button"
                        onMouseDown={() => setRevealHashId(u.id)}
                        onMouseUp={() => setRevealHashId(null)}
                        onMouseLeave={() => setRevealHashId(null)}
                        className="text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-muted)] shrink-0"
                        title="Hold to reveal hash"
                      >
                        {revealHashId === u.id
                          ? <EyeOff className="h-3 w-3" />
                          : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setResetId(resetId === u.id ? null : u.id); setResetPw(''); }}
                        className="text-[var(--color-text-muted)]/50 hover:text-[var(--color-accent)] shrink-0"
                        title="Reset password"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-text)]"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRow['role'])}
                      disabled={u.id === me?.id}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`text-xs rounded border border-transparent px-2 py-1 font-medium ${STATUS_COLORS[u.status]}`}
                      value={u.status}
                      onChange={(e) => changeStatus(u.id, e.target.value as UserRow['status'])}
                      disabled={u.id === me?.id}
                    >
                      {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditId(u.id); setEditName(u.name); }}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                        title="Edit name"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (u.id !== me?.id) setDeleteTarget(u); }}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] disabled:opacity-30"
                        title="Delete user and all data"
                        disabled={u.id === me?.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {resetId === u.id && (
                  <tr className="bg-[var(--color-accent)]/5">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0">New password for <strong>{u.name}</strong>:</span>
                        <Input
                          type="password"
                          className="h-7 text-xs max-w-[200px]"
                          placeholder="New password"
                          value={resetPw}
                          onChange={(e) => setResetPw(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') doResetPassword(u.id); if (e.key === 'Escape') setResetId(null); }}
                          autoFocus
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => doResetPassword(u.id)} disabled={!resetPw.trim()}>
                          Set
                        </Button>
                        <button onClick={() => setResetId(null)} className="text-[var(--color-text-muted)]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
