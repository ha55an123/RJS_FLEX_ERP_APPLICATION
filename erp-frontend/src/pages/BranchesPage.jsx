import { useState, useEffect } from 'react';
import { branchesAPI } from '../api/gym/branches';
import { Plus, Search, Edit, Trash2, MapPin, Phone, Mail, Building2 } from 'lucide-react';
import Toast from '../components/Toast';

const EMPTY = {
  name: '', code: '', address: '', city: '',
  phone: '', email: '', capacity: 100,
  opening_time: '06:00', closing_time: '22:00', notes: '',
};

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { loadBranches(); }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await branchesAPI.getAll();
      setBranches(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to load branches', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setFormData((p) => ({ ...p, [field]: e.target.value }));

  const openAdd = () => {
    setEditingBranch(null);
    setFormData(EMPTY);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingBranch(b);
    setFormData({
      name: b.name || '', code: b.code || '',
      address: b.address || '', city: b.city || '',
      phone: b.phone || '', email: b.email || '',
      capacity: b.capacity || 100,
      opening_time: b.opening_time || '06:00',
      closing_time: b.closing_time || '22:00',
      notes: b.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingBranch(null); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      address: formData.address || null,
      city: formData.city || null,
      phone: formData.phone || null,
      email: formData.email || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      opening_time: formData.opening_time || null,
      closing_time: formData.closing_time || null,
      notes: formData.notes || null,
      is_active: true,
    };
    setSubmitting(true);
    try {
      if (editingBranch) {
        await branchesAPI.update(editingBranch.id, payload);
        setToast({ message: 'Branch updated successfully', type: 'success' });
      } else {
        await branchesAPI.create(payload);
        setToast({ message: 'Branch created successfully', type: 'success' });
      }
      closeModal();
      loadBranches();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save branch';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this branch?')) return;
    try {
      await branchesAPI.delete(id);
      setToast({ message: 'Branch deactivated', type: 'success' });
      loadBranches();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to deactivate branch', type: 'error' });
    }
  };

  const filtered = branches.filter((b) =>
    `${b.name} ${b.code || ''} ${b.city || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Branches</h1>
          <p>{branches.length} branch{branches.length !== 1 ? 'es' : ''} registered</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Branch</button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search by name, code or city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading ? (
        <div className="page-loading">Loading branches...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Building2 size={48} />
          <h3>{searchTerm ? 'No branches match your search' : 'No branches yet'}</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'Create your first branch to get started.'}</p>
          {!searchTerm && <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Branch</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {filtered.map((b) => (
            <div key={b.id} className="kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>{b.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{b.code}</span>
                </div>
                <span className={`status-badge ${b.is_active ? 'success' : 'danger'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {b.city && <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}><MapPin size={13} />{b.city}</div>}
                {b.phone && <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}><Phone size={13} />{b.phone}</div>}
                {b.email && <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}><Mail size={13} />{b.email}</div>}
                <div style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                  Capacity: {b.capacity || '—'} &nbsp;|&nbsp; Hours: {b.opening_time || '?'} – {b.closing_time || '?'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={() => openEdit(b)} className="icon-btn" title="Edit"><Edit size={15} /></button>
                <button onClick={() => handleDelete(b.id)} className="icon-btn icon-btn-danger" title="Deactivate"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
              <button onClick={closeModal} className="icon-btn" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label>Branch Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.name} onChange={set('name')} placeholder="e.g. Main Branch" />
                  </div>
                  <div className="form-group">
                    <label>Branch Code <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.code} onChange={set('code')} placeholder="e.g. MAIN" />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" value={formData.city} onChange={set('city')} placeholder="e.g. Karachi" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={formData.phone} onChange={set('phone')} placeholder="021-1234567" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={set('email')} placeholder="branch@gym.com" />
                  </div>
                  <div className="form-group">
                    <label>Capacity</label>
                    <input type="number" min="1" value={formData.capacity} onChange={set('capacity')} />
                  </div>
                  <div className="form-group">
                    <label>Opening Time</label>
                    <input type="time" value={formData.opening_time} onChange={set('opening_time')} />
                  </div>
                  <div className="form-group">
                    <label>Closing Time</label>
                    <input type="time" value={formData.closing_time} onChange={set('closing_time')} />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea value={formData.address} onChange={set('address')} rows={2} placeholder="Full address" />
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea value={formData.notes} onChange={set('notes')} rows={2} placeholder="Optional notes" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (editingBranch ? 'Updating...' : 'Creating...') : (editingBranch ? 'Update Branch' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
