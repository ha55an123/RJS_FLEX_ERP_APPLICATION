import { useEffect, useState } from 'react';
import { getPurchaseRequests, getPurchaseRequestSummary, createPurchaseRequest, updatePurchaseRequest, managerApprove, adminApprove, rejectRequest, cancelRequest, deletePurchaseRequest, exportRequestsCSV } from '../api/purchaseRequests';
import { PlusCircle, ShoppingCart, Pencil, Trash2, Download, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PRIORITY_CLASS = { Low: 'info', Medium: 'warning', High: 'danger', Urgent: 'danger' };
const STATUS_CLASS = {
  Pending: 'warning', 'Manager Approved': 'info', 'Admin Approved': 'success',
  Rejected: 'danger', Purchased: 'success', Cancelled: 'danger',
};

function RequestModal({ request, onClose, onSuccess }) {
  const editing = !!request;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    item_name: request?.item_name || '',
    quantity: request?.quantity || 1,
    estimated_price: request?.estimated_price || '',
    vendor: request?.vendor || '',
    department: request?.department || '',
    request_date: request?.request_date || today,
    required_date: request?.required_date || '',
    priority: request?.priority || 'Medium',
    reason: request?.reason || '',
    remarks: request?.remarks || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, quantity: parseInt(form.quantity), estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null, required_date: form.required_date || null };
      if (editing) await updatePurchaseRequest(request.id, payload);
      else await createPurchaseRequest(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Request' : 'New Purchase Request'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div>
              <label>Item Name</label>
              <input value={form.item_name} onChange={(e) => set('item_name', e.target.value)} required placeholder="e.g. Office Chair" />
            </div>
            <div>
              <label>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
            </div>
            <div>
              <label>Estimated Price (PKR)</label>
              <input type="number" min="0" step="0.01" value={form.estimated_price} onChange={(e) => set('estimated_price', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label>Vendor</label>
              <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label>Department</label>
              <input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label>Request Date</label>
              <input type="date" value={form.request_date} onChange={(e) => set('request_date', e.target.value)} required />
            </div>
            <div>
              <label>Required By</label>
              <input type="date" value={form.required_date} onChange={(e) => set('required_date', e.target.value)} />
            </div>
          </div>
          <label>Reason</label>
          <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          <label>Remarks</label>
          <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

function ActionModal({ title, onConfirm, onClose }) {
  const [comments, setComments] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <label>Comments (optional)</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onConfirm(comments)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseRequestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'company_manager';
  const canApprove = isAdmin || isManager;

  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type, id }
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const [rRes, sRes] = await Promise.all([getPurchaseRequests(params), canApprove ? getPurchaseRequestSummary() : Promise.resolve({ data: null })]);
      setRequests(rRes.data);
      setSummary(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleAction = async (type, id, comments) => {
    try {
      if (type === 'manager-approve') await managerApprove(id, comments);
      else if (type === 'admin-approve') await adminApprove(id, comments);
      else if (type === 'reject') await rejectRequest(id, comments);
      setToast({ message: 'Action completed!', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed', type: 'error' });
    }
    setActionModal(null);
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this request?')) return;
    try {
      await cancelRequest(id);
      setToast({ message: 'Request cancelled', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await deletePurchaseRequest(id);
      setToast({ message: 'Request deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportRequestsCSV();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'purchase_requests.csv'; a.click();
    } catch {}
  };

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Purchase Requests</h1><p>{requests.length} requests</p></div>
        <div className="page-actions">
          {canApprove && <button className="btn-ghost" onClick={handleExport}><Download size={15} /> Export CSV</button>}
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> New Request</button>
        </div>
      </div>

      {summary && canApprove && (
        <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: 'Pending', value: summary.pending, color: '#f59e0b' },
            { label: 'Approved', value: summary.approved, color: '#10b981' },
            { label: 'Rejected', value: summary.rejected, color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-icon" style={{ background: `${color}18` }}><ShoppingCart size={22} color={color} /></div>
              <div><div className="kpi-label">{label}</div><div className="kpi-value" style={{ fontSize: '1.4rem' }}>{value}</div></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search item…" value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', minWidth: 160 }} />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Status</option>
          {['Pending', 'Manager Approved', 'Admin Approved', 'Rejected', 'Purchased', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="empty-state"><ShoppingCart size={48} /><p>No purchase requests found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Item</th><th>Qty</th><th>Est. Price</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th><th /></tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <>
                  <tr key={r.id}>
                    <td><span className="badge">{r.request_number}</span></td>
                    <td><strong>{r.item_name}</strong></td>
                    <td>{r.quantity}</td>
                    <td>{r.estimated_price ? `PKR ${Number(r.estimated_price).toLocaleString()}` : '—'}</td>
                    <td><span className={`status-badge ${PRIORITY_CLASS[r.priority] || ''}`}>{r.priority}</span></td>
                    <td><span className={`status-badge ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span></td>
                    <td className="text-muted">{r.request_date}</td>
                    <td style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {isManager && r.status === 'Pending' && (
                        <button className="btn-primary" style={{ padding: '0.28rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setActionModal({ type: 'manager-approve', id: r.id })}>
                          <CheckCircle size={12} /> Approve
                        </button>
                      )}
                      {isAdmin && r.status === 'Manager Approved' && (
                        <button className="btn-primary" style={{ padding: '0.28rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setActionModal({ type: 'admin-approve', id: r.id })}>
                          <CheckCircle size={12} /> Final Approve
                        </button>
                      )}
                      {canApprove && !['Rejected', 'Cancelled', 'Purchased'].includes(r.status) && (
                        <button className="btn-danger" style={{ padding: '0.28rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setActionModal({ type: 'reject', id: r.id })}>
                          <XCircle size={12} /> Reject
                        </button>
                      )}
                      {r.status === 'Pending' && (
                        <button className="btn-icon" onClick={() => setModal(r)}><Pencil size={13} /></button>
                      )}
                      {r.status === 'Pending' && (
                        <button className="btn-icon-danger" onClick={() => handleCancel(r.id)}><XCircle size={13} /></button>
                      )}
                      {isAdmin && (
                        <button className="btn-icon-danger" onClick={() => handleDelete(r.id)}><Trash2 size={13} /></button>
                      )}
                    </td>
                    <td>
                      <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => toggle(r.id)}>
                        {expanded[r.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expanded[r.id] && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={9} style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', fontSize: '0.82rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                          {r.department && <div><strong>Department:</strong> {r.department}</div>}
                          {r.vendor && <div><strong>Vendor:</strong> {r.vendor}</div>}
                          {r.required_date && <div><strong>Required By:</strong> {r.required_date}</div>}
                          {r.reason && <div><strong>Reason:</strong> {r.reason}</div>}
                          {r.manager_comments && <div><strong>Manager Comments:</strong> {r.manager_comments}</div>}
                          {r.admin_comments && <div><strong>Admin Comments:</strong> {r.admin_comments}</div>}
                          {r.approved_date && <div><strong>Approved On:</strong> {r.approved_date}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <RequestModal
          request={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Request saved!', type: 'success' }); load(); }}
        />
      )}

      {actionModal && (
        <ActionModal
          title={actionModal.type === 'manager-approve' ? 'Manager Approval' : actionModal.type === 'admin-approve' ? 'Admin Approval' : 'Reject Request'}
          onConfirm={(comments) => handleAction(actionModal.type, actionModal.id, comments)}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
