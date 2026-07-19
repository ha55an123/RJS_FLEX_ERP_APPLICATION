import { useEffect, useState } from 'react';
import { getProductionTechnologies, createProductionTechnology, updateProductionTechnology, deleteProductionTechnology, getProductionDepartments } from '../api/productionPayroll';
import { PlusCircle, Cog, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

function TechnologyModal({ technology, departments, onClose, onSuccess }) {
  const editing = !!technology;
  const [form, setForm] = useState({
    department_id: technology?.department_id || (departments[0]?.id || ''),
    name: technology?.name || '',
    unit_rate: technology?.unit_rate || '',
    status: technology?.status || 'active',
    description: technology?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, department_id: parseInt(form.department_id), unit_rate: parseFloat(form.unit_rate) };
      if (editing) await updateProductionTechnology(technology.id, payload);
      else await createProductionTechnology(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save technology');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Technology' : 'Add Technology'}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Department</label>
            <select value={form.department_id} onChange={(e) => set('department_id', e.target.value)} required>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label>Technology Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label>Unit Rate (PKR)</label>
            <input type="number" min="0" step="0.01" value={form.unit_rate} onChange={(e) => set('unit_rate', e.target.value)} required />
          </div>
          <div>
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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

export default function ProductionTechnologiesPage() {
  const [technologies, setTechnologies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [techRes, deptRes] = await Promise.all([getProductionTechnologies(), getProductionDepartments()]);
      setTechnologies(techRes.data);
      setDepartments(deptRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this technology?')) return;
    try {
      await deleteProductionTechnology(id);
      setToast({ message: 'Technology deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : '—';
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Production Technologies</h1><p>{technologies.length} technologies</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Technology</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading technologies…</div>
      ) : technologies.length === 0 ? (
        <div className="empty-state"><Cog size={48} /><p>No technologies found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Department</th><th>Name</th><th>Unit Rate</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {technologies.map((tech) => (
                <tr key={tech.id}>
                  <td><span className="badge">{tech.id}</span></td>
                  <td>{getDepartmentName(tech.department_id)}</td>
                  <td><strong>{tech.name}</strong></td>
                  <td><strong>PKR {Number(tech.unit_rate).toLocaleString()}</strong></td>
                  <td><span className={`status-badge ${tech.status === 'active' ? 'success' : 'info'}`}>{tech.status}</span></td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-icon" onClick={() => setModal(tech)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(tech.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TechnologyModal
          technology={modal === 'create' ? null : modal}
          departments={departments}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Technology saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
