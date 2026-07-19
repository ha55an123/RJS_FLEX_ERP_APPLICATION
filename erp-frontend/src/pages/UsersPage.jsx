import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import { getEmployees } from '../api/employees';
import { PlusCircle, Pencil, Trash2, UserCog, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

const ROLES = ['admin', 'company_manager', 'outlet_staff'];
const ROLE_COLOR = { admin: '#4f46e5', company_manager: '#0891b2', outlet_staff: '#059669' };

const EMPTY_FORM = {
  username: '', email: '', password: '', role: 'outlet_staff',
  employee_id: '', is_active: true,
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function UserModal({ user, employees, onClose, onSave }) {
  const editing = !!user?.id;
  const [form, setForm] = useState({ ...EMPTY_FORM, ...user, password: '', employee_id: user?.employee_id ?? '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)',
    borderRadius: 7, fontSize: '0.875rem', outline: 'none', background: 'var(--surface)',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (!payload.employee_id) delete payload.employee_id;
      else payload.employee_id = Number(payload.employee_id);
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <h3>{editing ? 'Edit App User' : 'Add App User'}</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Username *">
              <input style={inputStyle} value={form.username} onChange={set('username')} required placeholder="john_doe" />
            </Field>
            <Field label="Email *">
              <input style={inputStyle} type="email" value={form.email} onChange={set('email')} required />
            </Field>
            <Field label={editing ? 'New Password (optional)' : 'Password *'}>
              <input style={inputStyle} type="password" value={form.password} onChange={set('password')} required={!editing} placeholder={editing ? 'Leave blank to keep' : ''} />
            </Field>
            <Field label="Role *">
              <select style={inputStyle} value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label="Linked Employee">
              <select style={inputStyle} value={form.employee_id} onChange={set('employee_id')}>
                <option value="">— No employee linked —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}{emp.employee_code ? ` (${emp.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            {editing && (
              <Field label="Status">
                <select style={inputStyle} value={form.is_active ? 'true' : 'false'} onChange={(e) => setVal('is_active', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const usersRes = await getUsers();
      setUsers(usersRes.data);
    } catch (err) {
      setLoadError(err.response?.data?.detail || 'Failed to load users. Check your session.');
    }
    try {
      const empsRes = await getEmployees();
      setEmployees(empsRes.data);
    } catch {
      // employees failing shouldn't block the users page
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    if (modal?.id) await updateUser(modal.id, data);
    else await createUser(data);
    setToast({ message: modal?.id ? 'User updated' : 'User created', type: 'success' });
    load();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    try {
      await deleteUser(u.id);
      setToast({ message: 'User deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.employee_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>App Users</h1>
          <p>{users.length} login accounts</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal({})}>
            <PlusCircle size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          placeholder="Search by username, email or employee name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loading">Loading users…</div>
      ) : loadError ? (
        <div className="empty-state" style={{ color: 'var(--danger)' }}>
          <UserCog size={48} />
          <p>{loadError}</p>
          <button className="btn-ghost" style={{ marginTop: '0.5rem' }} onClick={load}>Try Again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><UserCog size={48} /><p>No users found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username / Email</th>
                <th>Linked Employee</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="text-muted">{u.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td className="text-muted">{u.employee_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not linked</span>}</td>
                  <td>
                    <span className="status-badge" style={{ background: (ROLE_COLOR[u.role] || '#888') + '18', color: ROLE_COLOR[u.role] || '#888' }}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.78rem' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'success' : 'danger'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button className="btn-icon" onClick={() => setModal(u)} title="Edit"><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(u)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <UserModal user={modal} employees={employees} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  );
}
