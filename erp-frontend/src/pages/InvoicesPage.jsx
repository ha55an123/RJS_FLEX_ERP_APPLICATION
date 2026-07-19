import { useEffect, useState } from 'react';
import { getMyInvoices, getAllInvoices, downloadInvoice, updateInvoiceStatus } from '../api/invoices';
import { useAuth } from '../context/AuthContext';
import { FileText, Download } from 'lucide-react';
import Toast from '../components/Toast';

const STATUS_CLASS = { unpaid: 'warning', paid: 'success', cancelled: 'danger' };
const STATUS_OPTIONS = ['unpaid', 'paid'];

export default function InvoicesPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'company_manager'].includes(user?.role);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = isManager ? await getAllInvoices() : await getMyInvoices();
      setInvoices(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [isManager]);

  const handleDownload = async (invoice) => {
    try {
      const { data } = await downloadInvoice(invoice.id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: 'Failed to download invoice', type: 'error' });
    }
  };

  const handleStatusChange = async (invoice, status) => {
    if (invoice.status === status) return;
    setUpdatingId(invoice.id);
    try {
      const { data } = await updateInvoiceStatus(invoice.id, status);
      setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? data : inv)));
      setToast({ message: `Invoice marked as ${status}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to update status', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>{invoices.length} {isManager ? 'total' : 'your'} invoices</p>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order ID</th>
                {isManager && <th>User ID</th>}
                <th>Total Amount (PKR)</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="badge">{inv.invoice_number}</span></td>
                  <td>#{inv.order_id}</td>
                  {isManager && <td>{inv.user_id}</td>}
                  <td><strong>PKR {Number(inv.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>
                    {isManager && inv.status !== 'cancelled' ? (
                      <select
                        value={inv.status}
                        disabled={updatingId === inv.id}
                        onChange={(e) => handleStatusChange(inv, e.target.value)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          border: '1px solid var(--border)',
                          borderRadius: 7,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: inv.status === 'paid' ? '#ecfdf5' : '#fffbeb',
                          color: inv.status === 'paid' ? '#059669' : '#d97706',
                          cursor: updatingId === inv.id ? 'wait' : 'pointer',
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`status-badge ${STATUS_CLASS[inv.status] || ''}`}>
                        {inv.status}
                      </span>
                    )}
                  </td>
                  <td className="text-muted">{new Date(inv.created_at).toLocaleString()}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleDownload(inv)} title="Download PDF">
                      <Download size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
