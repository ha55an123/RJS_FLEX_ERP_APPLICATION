import { useEffect, useState } from 'react';
import { getLedgers, createLedger, updateLedger, deleteLedger, exportLedgersCSV } from '../api/ledgers';
import { PlusCircle, BookOpen, Pencil, Trash2, Download, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

const TYPES = ['Asset', 'Liability', 'Income', 'Expense', 'Equity'];
const STATUS_CLASS = { Active: 'success', Inactive: 'danger' };

function LedgerModal({ ledger, onClose, onSuccess }) {
  const editing = !!ledger;
  const [form, setForm] = useState({
    ledger_name: ledger?.ledger_name || '',
    ledger_type: ledger?.ledger_type || 'Expense',
    description: ledger?.description || '',
    opening_balance: ledger?.opening_balance ?? 0,
    status: ledger?.status || 'Active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) await updateLedger(ledger.id, form);
      else await createLedger({ ...form, opening_balance: parseFloat(form.opening_balance) });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save ledger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Ledger' : 'New Ledger Account'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Ledger Name</label>
          <input value={form.ledger_name} onChange={(e) => set('ledger_name', e.target.value)} required placeholder="e.g. Office Expenses" />
          <label>Type</label>
          <select value={form.ledger_type} onChange={(e) => set('ledger_type', e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label>Opening Balance (PKR)</label>
          <input type="number" min="0" step="0.01" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} />
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          <label>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | ledger object
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getLedgers({ search, ledger_type: filterType, status: filterStatus });
      setLedgers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, filterType, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this ledger?')) return;
    try {
      await deleteLedger(id);
      setToast({ message: 'Ledger deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportLedgersCSV();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'ledgers.csv'; a.click();
    } catch {}
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Ledger Accounts</h1>
          <p>{ledgers.length} accounts</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={handleExport}><Download size={15} /> Export CSV</button>
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> New Ledger</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Search ledger…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.55rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', minWidth: 200 }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.55rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.55rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading">Loading ledgers…</div>
      ) : ledgers.length === 0 ? (
        <div className="empty-state"><BookOpen size={48} /><p>No ledger accounts yet</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Type</th><th>Opening Balance</th><th>Current Balance</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((l) => (
                <tr key={l.id}>
                  <td><span className="badge">{l.ledger_code}</span></td>
                  <td><strong>{l.ledger_name}</strong></td>
                  <td><span className="status-badge info">{l.ledger_type}</span></td>
                  <td>PKR {Number(l.opening_balance).toLocaleString()}</td>
                  <td><strong>PKR {Number(l.current_balance).toLocaleString()}</strong></td>
                  <td><span className={`status-badge ${STATUS_CLASS[l.status] || ''}`}>{l.status}</span></td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-icon" onClick={() => setModal(l)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(l.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <LedgerModal
          ledger={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Ledger saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
