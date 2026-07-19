import { useEffect, useState } from 'react';
import { getProductionEntries, createProductionEntry, updateProductionEntry, deleteProductionEntry, getProductionTechnologies } from '../api/productionPayroll';
import { getEmployees } from '../api/employees';
import { PlusCircle, ClipboardList, Pencil, Trash2, RefreshCw, Calendar } from 'lucide-react';
import Toast from '../components/Toast';

function EntryModal({ entry, employees, technologies, onClose, onSuccess }) {
  const editing = !!entry;
  const [form, setForm] = useState({
    employee_id: entry?.employee_id || (employees[0]?.id || ''),
    technology_id: entry?.technology_id || (technologies[0]?.id || ''),
    production_date: entry?.production_date || new Date().toISOString().split('T')[0],
    quantity: entry?.quantity || '',
    remarks: entry?.remarks || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, employee_id: parseInt(form.employee_id), technology_id: parseInt(form.technology_id), quantity: parseFloat(form.quantity) };
      if (editing) await updateProductionEntry(entry.id, payload);
      else await createProductionEntry(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === parseInt(empId));
    return emp ? `${emp.full_name} (${emp.employee_code})` : '—';
  };

  const getTechnologyName = (techId) => {
    const tech = technologies.find(t => t.id === parseInt(techId));
    return tech ? tech.name : '—';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Production Entry' : 'Add Production Entry'}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Employee</label>
            <select value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} required>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div>
            <label>Technology</label>
            <select value={form.technology_id} onChange={(e) => set('technology_id', e.target.value)} required>
              {technologies.map((t) => <option key={t.id} value={t.id}>{t.name} (PKR {t.unit_rate}/unit)</option>)}
            </select>
          </div>
          <div>
            <label>Production Date</label>
            <input type="date" value={form.production_date} onChange={(e) => set('production_date', e.target.value)} required />
          </div>
          <div>
            <label>Quantity</label>
            <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
          </div>
          <div>
            <label>Remarks</label>
            <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>
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

export default function ProductionEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ employee_id: '', technology_id: '', start_date: '', end_date: '' });

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const [entryRes, empRes, techRes] = await Promise.all([
        getProductionEntries(params),
        getEmployees(),
        getProductionTechnologies()
      ]);
      setEntries(entryRes.data);
      setEmployees(empRes.data);
      setTechnologies(techRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteProductionEntry(id);
      setToast({ message: 'Entry deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.full_name} (${emp.employee_code})` : '—';
  };

  const getTechnologyName = (techId) => {
    const tech = technologies.find(t => t.id === techId);
    return tech ? tech.name : '—';
  };

  const getTechnologyRate = (techId) => {
    const tech = technologies.find(t => t.id === techId);
    return tech ? tech.unit_rate : 0;
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Production Entries</h1><p>{entries.length} entries</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Entry</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filters.employee_id} onChange={(e) => setFilter('employee_id', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <select value={filters.technology_id} onChange={(e) => setFilter('technology_id', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Technologies</option>
          {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" placeholder="Start Date" value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }} />
        <input type="date" placeholder="End Date" value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }} />
      </div>

      {loading ? (
        <div className="page-loading">Loading entries…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><ClipboardList size={48} /><p>No production entries found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Employee</th><th>Technology</th><th>Date</th><th>Quantity</th><th>Rate</th><th>Total</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const rate = getTechnologyRate(entry.technology_id);
                const total = entry.quantity * rate;
                return (
                  <tr key={entry.id}>
                    <td><span className="badge">{entry.id}</span></td>
                    <td>{getEmployeeName(entry.employee_id)}</td>
                    <td><strong>{getTechnologyName(entry.technology_id)}</strong></td>
                    <td className="text-muted">{entry.production_date}</td>
                    <td>{entry.quantity}</td>
                    <td className="text-muted">PKR {Number(rate).toLocaleString()}</td>
                    <td><strong>PKR {Number(total).toLocaleString()}</strong></td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn-icon" onClick={() => setModal(entry)}><Pencil size={14} /></button>
                      <button className="btn-icon-danger" onClick={() => handleDelete(entry.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <EntryModal
          entry={modal === 'create' ? null : modal}
          employees={employees}
          technologies={technologies}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Entry saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
