import { useEffect, useState } from 'react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees';
import { PlusCircle, Pencil, Trash2, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Toast from '../components/Toast';

const EMPTY_FORM = {
  full_name: '', employee_code: '', designation: '', department: '',
  phone: '', email: '', address: '', joining_date: '', salary: '', status: 'active', notes: '',
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

function EmployeeModal({ employee, onClose, onSave }) {
  const editing = !!employee?.id;
  const [form, setForm] = useState({ ...EMPTY_FORM, ...employee });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      if (!payload.salary) delete payload.salary;
      if (!payload.joining_date) delete payload.joining_date;
      if (!payload.email) delete payload.email;
      if (!payload.employee_code) delete payload.employee_code;
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h2 id="employee-modal-title">{editing ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close employee modal">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Full Name *">
              <input style={inputStyle} value={form.full_name} onChange={set('full_name')} required placeholder="John Doe" />
            </Field>
            <Field label="Employee Code">
              <input style={inputStyle} value={form.employee_code} onChange={set('employee_code')} placeholder="EMP-001" />
            </Field>
            <Field label="Designation">
              <input style={inputStyle} value={form.designation} onChange={set('designation')} placeholder="e.g. Senior Developer" />
            </Field>
            <Field label="Department">
              <input style={inputStyle} value={form.department} onChange={set('department')} placeholder="e.g. Sales, HR, IT" />
            </Field>
            <Field label="Phone">
              <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="employee@company.com" />
            </Field>
            <Field label="Date of Joining">
              <input style={inputStyle} type="date" value={form.joining_date || ''} onChange={set('joining_date')} />
            </Field>
            <Field label="Salary (PKR)">
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.salary} onChange={set('salary')} placeholder="e.g. 50000" />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            </div>

            <Field label="Address">
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={form.address} onChange={set('address')} placeholder="Full address" />
            </Field>
            <Field label="Notes">
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={set('notes')} placeholder="Any additional notes…" />
            </Field>

            {error && <p className="auth-error">{error}</p>}
          </div>
          <div className="modal-footer" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailRow({ emp }) {
  const items = [
    ['Employee Code', emp.employee_code],
    ['Email', emp.email],
    ['Phone', emp.phone],
    ['Designation', emp.designation],
    ['Date of Joining', emp.joining_date],
    ['Salary', emp.salary != null ? `PKR ${Number(emp.salary).toLocaleString()}` : null],
    ['Address', emp.address],
    ['Notes', emp.notes],
  ].filter(([, v]) => v);

  if (!items.length) return (
    <tr><td colSpan={6} style={{ padding: '0.75rem 1rem', background: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No additional details on record.</td></tr>
  );

  return (
    <tr>
      <td colSpan={6} style={{ padding: '0.75rem 1.25rem 1rem', background: '#f8fafc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem 1.5rem' }}>
          {items.map(([label, value]) => (
            <div key={label}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try { const { data } = await getEmployees(); setEmployees(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    if (modal?.id) await updateEmployee(modal.id, data);
    else await createEmployee(data);
    setToast({ message: modal?.id ? 'Employee updated' : 'Employee added', type: 'success' });
    load();
  };

  const handleDelete = async (emp) => {
    if (!confirm(`Delete employee "${emp.full_name}"?`)) return;
    try {
      await deleteEmployee(emp.id);
      setToast({ message: 'Employee deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const filtered = employees.filter((e) =>
    (e.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.designation || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.employee_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p>{employees.length} total employees</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal({})}>
            <PlusCircle size={15} /> Add Employee
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          placeholder="Search by name, department, designation or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loading">Loading employees…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Users size={48} /><p>No employees found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <>
                  <tr key={emp.id}>
                    <td className="text-muted">{emp.employee_code || emp.id}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emp.full_name}</td>
                    <td className="text-muted">{emp.designation || '—'}</td>
                    <td className="text-muted">{emp.department || '—'}</td>
                    <td className="text-muted">{emp.phone || '—'}</td>
                    <td>
                      <span className={`status-badge ${emp.status === 'active' ? 'success' : 'danger'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => toggle(emp.id)}>
                        {expanded[emp.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button className="btn-icon" onClick={() => setModal(emp)} title="Edit"><Pencil size={14} /></button>
                      <button className="btn-icon-danger" onClick={() => handleDelete(emp)} title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                  {expanded[emp.id] && <DetailRow key={`${emp.id}-detail`} emp={emp} />}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <EmployeeModal employee={modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  );
}
