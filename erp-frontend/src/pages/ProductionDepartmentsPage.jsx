import { useEffect, useState } from 'react';
import { getProductionDepartments, createProductionDepartment, updateProductionDepartment, deleteProductionDepartment } from '../api/productionPayroll';
import { PlusCircle, Building2, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

function DepartmentModal({ department, onClose, onSuccess }) {
  const editing = !!department;
  const [form, setForm] = useState({
    name: department?.name || '',
    description: department?.description || '',
    status: department?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) await updateProductionDepartment(department.id, form);
      else await createProductionDepartment(form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Department' : 'Add Department'}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Department Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required />
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

export default function ProductionDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getProductionDepartments();
      setDepartments(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await deleteProductionDepartment(id);
      setToast({ message: 'Department deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Production Departments</h1><p>{departments.length} departments</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Department</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading departments…</div>
      ) : departments.length === 0 ? (
        <div className="empty-state"><Building2 size={48} /><p>No departments found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td><span className="badge">{dept.id}</span></td>
                  <td><strong>{dept.name}</strong></td>
                  <td className="text-muted">{dept.description || '—'}</td>
                  <td><span className={`status-badge ${dept.status === 'active' ? 'success' : 'info'}`}>{dept.status}</span></td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-icon" onClick={() => setModal(dept)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(dept.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <DepartmentModal
          department={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Department saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
