import { useEffect, useState } from 'react';
import { getExpenses, getExpenseSummary, createExpense, updateExpense, deleteExpense, exportExpensesCSV } from '../api/expenses';
import { getLedgers } from '../api/ledgers';
import { PlusCircle, Receipt, Pencil, Trash2, Download, RefreshCw, TrendingDown } from 'lucide-react';
import Toast from '../components/Toast';

const CATEGORIES = ['Fuel', 'Office Supplies', 'Travel', 'Internet', 'Tea', 'Cleaning', 'Maintenance', 'Repair', 'Courier', 'Miscellaneous', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Bank', 'Cheque', 'Online Transfer'];

function ExpenseModal({ expense, ledgers, onClose, onSuccess }) {
  const editing = !!expense;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    expense_date: expense?.expense_date || today,
    ledger_id: expense?.ledger_id || (ledgers[0]?.id || ''),
    category: expense?.category || 'Miscellaneous',
    amount: expense?.amount || '',
    payment_method: expense?.payment_method || 'Cash',
    vendor_name: expense?.vendor_name || '',
    invoice_number: expense?.invoice_number || '',
    description: expense?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, ledger_id: parseInt(form.ledger_id), amount: parseFloat(form.amount) };
      if (editing) await updateExpense(expense.id, payload);
      else await createExpense(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div>
              <label>Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} required />
            </div>
            <div>
              <label>Ledger Account</label>
              <select value={form.ledger_id} onChange={(e) => set('ledger_id', e.target.value)} required>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.ledger_name}</option>)}
              </select>
            </div>
            <div>
              <label>Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Amount (PKR)</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </div>
            <div>
              <label>Payment Method</label>
              <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Vendor Name</label>
              <input value={form.vendor_name} onChange={(e) => set('vendor_name', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label>Invoice #</label>
              <input value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', payment_method: '', ledger_id: '', month: '', year: '' });

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const [expRes, sumRes, ledRes] = await Promise.all([getExpenses(params), getExpenseSummary(), getLedgers({})]);
      setExpenses(expRes.data);
      setSummary(sumRes.data);
      setLedgers(ledRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      setToast({ message: 'Expense deleted', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Cannot delete', type: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportExpensesCSV();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    } catch {}
  };

  const fmt = (n) => `PKR ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><h1>Daily Expenses</h1><p>{expenses.length} records</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={handleExport}><Download size={15} /> Export CSV</button>
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setModal('create')}><PlusCircle size={15} /> Add Expense</button>
        </div>
      </div>

      {summary && (
        <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: "Today's Expenses", value: fmt(summary.today), color: '#ef4444' },
            { label: 'This Month', value: fmt(summary.this_month), color: '#f59e0b' },
            { label: 'This Year', value: fmt(summary.this_year), color: '#6366f1' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <div className="kpi-icon" style={{ background: `${color}18` }}><TrendingDown size={22} color={color} /></div>
              <div><div className="kpi-label">{label}</div><div className="kpi-value" style={{ fontSize: '1.1rem' }}>{value}</div></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search…" value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', minWidth: 160 }} />
        <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.payment_method} onChange={(e) => setFilter('payment_method', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={filters.ledger_id} onChange={(e) => setFilter('ledger_id', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem' }}>
          <option value="">All Ledgers</option>
          {ledgers.map((l) => <option key={l.id} value={l.id}>{l.ledger_name}</option>)}
        </select>
        <input type="number" placeholder="Month" min="1" max="12" value={filters.month} onChange={(e) => setFilter('month', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', width: 90 }} />
        <input type="number" placeholder="Year" value={filters.year} onChange={(e) => setFilter('year', e.target.value)}
          style={{ padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', width: 90 }} />
      </div>

      {loading ? (
        <div className="page-loading">Loading expenses…</div>
      ) : expenses.length === 0 ? (
        <div className="empty-state"><Receipt size={48} /><p>No expenses found</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Date</th><th>Ledger</th><th>Category</th><th>Amount</th><th>Method</th><th>Vendor</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td><span className="badge">{e.expense_number}</span></td>
                  <td className="text-muted">{e.expense_date}</td>
                  <td>{e.ledger_name}</td>
                  <td><span className="status-badge info">{e.category}</span></td>
                  <td><strong>PKR {Number(e.amount).toLocaleString()}</strong></td>
                  <td className="text-muted">{e.payment_method}</td>
                  <td className="text-muted">{e.vendor_name || '—'}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-icon" onClick={() => setModal(e)}><Pencil size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ExpenseModal
          expense={modal === 'create' ? null : modal}
          ledgers={ledgers}
          onClose={() => setModal(null)}
          onSuccess={() => { setToast({ message: 'Expense saved!', type: 'success' }); load(); }}
        />
      )}
    </div>
  );
}
