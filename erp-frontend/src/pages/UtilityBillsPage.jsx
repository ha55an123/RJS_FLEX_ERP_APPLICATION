import { useEffect, useState } from 'react';
import { getUtilityBills, getUtilityBillSummary, getUpcomingBills, createUtilityBill, updateUtilityBill, markBillPaid, deleteUtilityBill, exportBillsCSV } from '../api/utilityBills';
import { getLedgers } from '../api/ledgers';
import { PlusCircle, Zap, Pencil, Trash2, Download, RefreshCw, CheckCircle, Bell } from 'lucide-react';
import Toast from '../components/Toast';

const UTILITY_TYPES = ['Electricity', 'Water', 'Internet', 'Gas', 'Rent', 'Telephone', 'Security', 'Generator Fuel', 'Cloud Services', 'Software Licenses', 'Other'];
const STATUS_CLASS = { Pending: 'warning', Paid: 'success', Overdue: 'danger', Cancelled: 'info' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function BillModal({ bill, ledgers, onClose, onSuccess }) {
  const editing = !!bill;
  const today = new Date();
  const [form, setForm] = useState({
    utility_type: bill?.utility_type || 'Electricity',
    ledger_id: bill?.ledger_id || (ledgers[0]?.id || ''),
    billing_month: bill?.billing_month || today.getMonth() + 1,
    billing_year: bill?.billing_year || today.getFullYear(),
    due_date: bill?.due_date || today.toISOString().split('T')[0],
    amount: bill?.amount || '',
    late_fee: bill?.late_fee ?? 0,
    notes: bill?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, ledger_id: parseInt(form.ledger_id), billing_month: parseInt(form.billing_month), billing_year: parseInt(form.billing_year), amount: parseFloat(form.amount), late_fee: parseFloat(form.late_fee) };
      if (editing) await updateUtilityBill(bill.id, payload);
      else await createUtilityBill(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Bill' : 'Add Utility Bill'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div>
              <label>Utility Type</label>
              <select value={form.utility_type} onChange={(e) => set('utility_type', e.target.value)}>
                {UTILITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Ledger Account</label>
              <select value={form.ledger_id} onChange={(e) => set('ledger_id', e.target.value)} required>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.ledger_name}</option>)}
              </select>
            </div>
            <div>
              <label>Billing Month</label>
              <select value={form.billing_month} onChange={(e) => set('billing_month', e.target.value)}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Billing Year</label>
              <input type="number" value={form.billing_year} onChange={(e) => set('billing_year', e.target.value)} required />
            </div>
            <div>
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} required />
            </div>
            <div>
              <label>Amount (PKR)</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </div>
            <div>
              <label>Late Fee (PKR)</label>
              <input type="number" min="0" step="0.01" value={form.late_fee} onChange={(e) => set('late_fee', e.target.value)} />
            </div>
          </div>
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

export default function UtilityBillsPage() {
  const [bills, setBills] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.utility_type = filterType;
      const [bRes, sRes, uRes, lRes] = await Promise.all([
        getUtilityBills(params), getUtilityBillSummary(), getUpcomingBills(), getLedgers({})
      ]);
      setBills(bRes.data);
      setSummary(sRes.data);
      setUpcoming(uRes.data);
      setLedgers(lRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus, filterType]);

  const handlePay = async (id) => {
    if (!confirm('Mark this bill as paid?')) return;
    try {
      await markBillPaid(id);
      setToast({ message: 'Bill marked as paid!', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await deleteUtilityBill(id);
      setToast({ message: 'Bill deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportBillsCSV();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'utility_bills.csv'; a.click();
    } catch {}
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Utility Bills</h1><p>{bills.length} bills</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={handleExport}><Download size={15} /> Export CSV</button>
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Bill</button>
        </div>
      </div>

      {summary && (
        <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: 'Pending', value: summary.pending, color: '#f59e0b' },
            { label: 'Paid', value: summary.paid, color: '#10b981' },
            { label: 'Overdue', value: summary.overdue, color: '#ef4444' },
            { label: 'Month Cost', value: `PKR ${Number(summary.month_cost).toLocaleString()}`, color: '#6366f1' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-icon" style={{ background: `${color}18` }}><Zap size={22} color={color} /></div>
              <div><div className="kpi-label">{label}</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{value}</div></div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bell size={16} color="#d97706" />
          <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>{upcoming.length} bill(s)</strong> due within 7 days: {upcoming.map((b) => `${b.utility_type} (${b.due_date})`).join(', ')}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Status</option>
          {['Pending', 'Paid', 'Overdue', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Types</option>
          {UTILITY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading">Loading bills…</div>
      ) : bills.length === 0 ? (
        <div className="empty-state"><Zap size={48} /><p>No utility bills found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Type</th><th>Period</th><th>Due Date</th><th>Amount</th><th>Late Fee</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td><span className="badge">{b.bill_number}</span></td>
                  <td><strong>{b.utility_type}</strong></td>
                  <td className="text-muted">{MONTHS[b.billing_month - 1]} {b.billing_year}</td>
                  <td className="text-muted">{b.due_date}</td>
                  <td><strong>PKR {Number(b.amount).toLocaleString()}</strong></td>
                  <td className="text-muted">{b.late_fee > 0 ? `PKR ${Number(b.late_fee).toLocaleString()}` : '—'}</td>
                  <td><span className={`status-badge ${STATUS_CLASS[b.status] || ''}`}>{b.status}</span></td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    {b.status === 'Pending' && (
                      <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => handlePay(b.id)}>
                        <CheckCircle size={13} /> Pay
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => setModal(b)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <BillModal
          bill={modal === 'create' ? null : modal}
          ledgers={ledgers}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Bill saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
