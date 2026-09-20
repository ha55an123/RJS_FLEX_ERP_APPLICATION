import { useState, useEffect } from 'react';
import { staffAPI } from '../api/gym/staff';
import { branchesAPI } from '../api/gym/branches';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import Toast from '../components/Toast';

const EMPTY = {
  branch_id: '', first_name: '', last_name: '', gender: 'male',
  phone: '', email: '', address: '', cnic: '', date_of_birth: '',
  role: 'trainer', designation: '', specialization: '',
  experience_years: '', salary: '', commission_percent: '0',
};

export default function GymStaffPage() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { loadData(); }, []);

  // close modal on Escape and trap focus minimally
  useEffect(() => {
    const onKey = (e) => {
      if (!showModal) return;
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes] = await Promise.all([staffAPI.getAll(), branchesAPI.getAll()]);
      setStaff(staffRes.data?.items || []);
      const bl = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.items || []);
      setBranches(bl);
    } catch (err) {
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const set = (f) => (e) => setFormData((p) => ({ ...p, [f]: e.target.value }));

  const openAdd = () => {
    setEditingStaff(null);
    const defaultBranch = branches.length === 1 ? String(branches[0].id) : '';
    setFormData({ ...EMPTY, branch_id: defaultBranch });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setFormData({
      branch_id: String(s.branch_id || ''),
      first_name: s.first_name || '', last_name: s.last_name || '',
      gender: s.gender || 'male', phone: s.phone || '', email: s.email || '',
      address: s.address || '', cnic: s.cnic || '',
      date_of_birth: s.date_of_birth || '', role: s.role || 'trainer',
      designation: s.designation || '', specialization: s.specialization || '',
      experience_years: s.experience_years != null ? String(s.experience_years) : '',
      salary: s.salary != null ? String(s.salary) : '',
      commission_percent: s.commission_percent != null ? String(s.commission_percent) : '0',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormError('');
  };

  // manage body scroll lock centrally when modal is shown
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.branch_id) { setFormError('Please select a branch.'); return; }

    const payload = {
      branch_id: Number(formData.branch_id),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      gender: formData.gender || null,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      cnic: formData.cnic || null,
      date_of_birth: formData.date_of_birth || null,
      role: formData.role,
      designation: formData.designation || null,
      specialization: formData.specialization || null,
      experience_years: formData.experience_years ? Number(formData.experience_years) : null,
      salary: formData.salary ? Number(formData.salary) : null,
      commission_percent: formData.commission_percent ? Number(formData.commission_percent) : 0,
    };

    setSubmitting(true);
    try {
      if (editingStaff) {
        await staffAPI.update(editingStaff.id, payload);
        setToast({ message: 'Staff member updated successfully', type: 'success' });
      } else {
        await staffAPI.create(payload);
        setToast({ message: 'Staff member created successfully', type: 'success' });
      }
      closeModal();
      loadData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save staff member';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await staffAPI.delete(id);
      setToast({ message: 'Staff member removed', type: 'success' });
      loadData();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to remove staff', type: 'error' });
    }
  };

  const filtered = staff.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.staff_code || ''} ${s.phone || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="page-loading">Loading staff...</div>;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Trainers & Staff</h1>
        <button onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Staff</button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search by name, code or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Specialization</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.staff_code || '-'}</td>
                <td>{s.first_name} {s.last_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{s.role || '-'}</td>
                <td>{s.specialization || '-'}</td>
                <td>{s.phone || '-'}</td>
                <td><span className={`status-badge ${s.status === 'active' ? 'success' : 'danger'}`}>{s.status || 'active'}</span></td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => openEdit(s)} className="icon-btn" title="Edit"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(s.id)} className="icon-btn icon-btn-danger" title="Remove"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h3>{searchTerm ? 'No staff match your search' : 'No staff members yet'}</h3>
            <p>{searchTerm ? 'Try a different search.' : 'Add your first trainer or staff member.'}</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" onClick={closeModal}>
          <div className="modal-card" style={{ maxWidth: 600, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="staff-modal-title">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <button onClick={closeModal} className="icon-btn" aria-label="Close staff modal" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" onKeyDown={(e) => { if (e.key === 'Tab') { /* minimal focus trap: keep focus inside modal */ } }}>
              <div className="modal-body" tabIndex={0}>
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Branch <span style={{ color: 'var(--primary)' }}>*</span></label>
                    {branches.length === 0 ? (
                      <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>No branches found. Create a branch first.</p>
                    ) : (
                      <select value={formData.branch_id} onChange={set('branch_id')} required>
                        <option value="">— Select Branch —</option>
                        {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label>First Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.first_name} onChange={set('first_name')} placeholder="First name" />
                  </div>
                  <div className="form-group">
                    <label>Last Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.last_name} onChange={set('last_name')} placeholder="Last name" />
                  </div>
                  <div className="form-group">
                    <label>Role <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <select value={formData.role} onChange={set('role')} required>
                      <option value="trainer">Trainer</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="manager">Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="inventory_manager">Inventory Manager</option>
                      <option value="cleaner">Cleaner</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select value={formData.gender} onChange={set('gender')}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={formData.phone} onChange={set('phone')} placeholder="0300-0000000" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={set('email')} placeholder="staff@gym.com" />
                  </div>
                  <div className="form-group">
                    <label>CNIC</label>
                    <input type="text" value={formData.cnic} onChange={set('cnic')} placeholder="35202-0000000-0" />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} />
                  </div>
                  <div className="form-group">
                    <label>Designation</label>
                    <input type="text" value={formData.designation} onChange={set('designation')} placeholder="e.g. Head Trainer" />
                  </div>
                  <div className="form-group">
                    <label>Specialization</label>
                    <input type="text" value={formData.specialization} onChange={set('specialization')} placeholder="e.g. Weight Training" />
                  </div>
                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input type="number" min="0" value={formData.experience_years} onChange={set('experience_years')} />
                  </div>
                  <div className="form-group">
                    <label>Salary (PKR)</label>
                    <input type="number" min="0" value={formData.salary} onChange={set('salary')} />
                  </div>
                  <div className="form-group">
                    <label>Commission %</label>
                    <input type="number" min="0" max="100" step="0.1" value={formData.commission_percent} onChange={set('commission_percent')} />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea value={formData.address} onChange={set('address')} rows={2} placeholder="Full address" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || branches.length === 0}>
                  {submitting ? (editingStaff ? 'Updating...' : 'Creating...') : (editingStaff ? 'Update Staff' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
