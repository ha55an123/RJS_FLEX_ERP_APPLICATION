import { useEffect, useState } from 'react';
import { getEmployeeAssignments, createEmployeeAssignment, updateEmployeeAssignment, deleteEmployeeAssignment, getProductionDepartments, getProductionTechnologies } from '../api/productionPayroll';
import { getEmployees } from '../api/employees';
import { PlusCircle, UserCog, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Toast from '../components/Toast';

function AssignmentModal({ assignment, employees, technologies, onClose, onSuccess }) {
  const editing = !!assignment;
  const [form, setForm] = useState({
    employee_id: assignment?.employee_id || (employees[0]?.id || ''),
    technology_id: assignment?.technology_id || (technologies[0]?.id || ''),
    assigned_date: assignment?.assigned_date || new Date().toISOString().split('T')[0],
    status: assignment?.status || 'active',
    notes: assignment?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, employee_id: parseInt(form.employee_id), technology_id: parseInt(form.technology_id) };
      if (editing) await updateEmployeeAssignment(assignment.id, payload);
      else await createEmployeeAssignment(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save assignment');
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
        <h3>{editing ? 'Edit Assignment' : 'Add Assignment'}</h3>
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
              {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label>Assigned Date</label>
            <input type="date" value={form.assigned_date} onChange={(e) => set('assigned_date', e.target.value)} required />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

export default function ProductionAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [assignRes, empRes, techRes] = await Promise.all([
        getEmployeeAssignments(),
        getEmployees(),
        getProductionTechnologies()
      ]);
      setAssignments(assignRes.data);
      setEmployees(empRes.data);
      setTechnologies(techRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await deleteEmployeeAssignment(id);
      setToast({ message: 'Assignment deleted', type: 'success' });
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

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Employee Technology Assignments</h1><p>{assignments.length} assignments</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Assignment</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="empty-state"><UserCog size={48} /><p>No assignments found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Employee</th><th>Technology</th><th>Assigned Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {assignments.map((assign) => (
                <tr key={assign.id}>
                  <td><span className="badge">{assign.id}</span></td>
                  <td>{getEmployeeName(assign.employee_id)}</td>
                  <td><strong>{getTechnologyName(assign.technology_id)}</strong></td>
                  <td className="text-muted">{assign.assigned_date}</td>
                  <td><span className={`status-badge ${assign.status === 'active' ? 'success' : 'info'}`}>{assign.status}</span></td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-icon" onClick={() => setModal(assign)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(assign.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AssignmentModal
          assignment={modal === 'create' ? null : modal}
          employees={employees}
          technologies={technologies}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Assignment saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
