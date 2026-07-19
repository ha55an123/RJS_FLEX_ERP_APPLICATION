import { useEffect, useState } from 'react';
import { getPurchases, createPurchase, receivePurchase, cancelPurchase } from '../api/purchases';
import { PlusCircle, ShoppingBag, Trash2, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Toast from '../components/Toast';

function CreatePOModal({ onClose, onSuccess }) {
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState([{ sku: '', item_name: '', quantity: 1, unit_cost: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setItem = (i, k, v) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addLine = () => setItems((p) => [...p, { sku: '', item_name: '', quantity: 1, unit_cost: 0 }]);
  const removeLine = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createPurchase({
        supplier_name: supplier,
        items: items.map((i) => ({
          sku: i.sku,
          item_name: i.item_name,
          quantity: parseInt(i.quantity),
          unit_cost: parseFloat(i.unit_cost),
        })),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <h3>New Purchase Order</h3>
        <form onSubmit={handleSubmit}>
          <label>Supplier Name</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. ABC Supplies Ltd" required />

          <label>Items</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 70px 90px 32px', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              <span>SKU</span><span>Item Name</span><span>Qty</span><span>Unit Cost (PKR)</span><span />
            </div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 70px 90px 32px', gap: '0.4rem', alignItems: 'center' }}>
                <input value={item.sku} onChange={(e) => setItem(i, 'sku', e.target.value)} placeholder="SKU-001" required style={{ padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', marginBottom: 0 }} />
                <input value={item.item_name} onChange={(e) => setItem(i, 'item_name', e.target.value)} placeholder="Item name" required style={{ padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', marginBottom: 0 }} />
                <input type="number" min="1" value={item.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} required style={{ padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', marginBottom: 0 }} />
                <input type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e) => setItem(i, 'unit_cost', e.target.value)} required style={{ padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', marginBottom: 0 }} />
                {items.length > 1 ? (
                  <button type="button" className="btn-icon-danger" onClick={() => removeLine(i)}><Trash2 size={14} /></button>
                ) : <span />}
              </div>
            ))}
          </div>

          <button type="button" className="btn-ghost" onClick={addLine} style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
            + Add Item
          </button>

          <div style={{ textAlign: 'right', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
            Total: PKR {Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_CLASS = { pending: 'warning', received: 'success', cancelled: 'danger' };
const STATUS_ICON = { pending: null, received: CheckCircle, cancelled: XCircle };

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try { const { data } = await getPurchases(); setPurchases(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReceive = async (id) => {
    try {
      await receivePurchase(id);
      setToast({ message: 'Purchase received — inventory updated!', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to receive', type: 'error' });
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this purchase order?')) return;
    try {
      await cancelPurchase(id);
      setToast({ message: 'Purchase order cancelled', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to cancel', type: 'error' });
    }
  };

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>{purchases.length} total purchase orders</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <PlusCircle size={15} /> New Purchase Order
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading purchases…</div>
      ) : purchases.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} />
          <p>No purchase orders yet</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Total Amount (PKR)</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((po) => (
                <>
                  <tr key={po.id}>
                    <td><strong>#{po.id}</strong></td>
                    <td>{po.supplier_name}</td>
                    <td><strong>PKR {Number(po.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASS[po.status] || ''}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(po.created_at).toLocaleString()}</td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      {po.status === 'pending' && (
                        <>
                          <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => handleReceive(po.id)}>
                            <CheckCircle size={13} /> Receive
                          </button>
                          <button className="btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => handleCancel(po.id)}>
                            <XCircle size={13} /> Cancel
                          </button>
                        </>
                      )}
                    </td>
                    <td>
                      <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }} onClick={() => toggle(po.id)}>
                        {expanded[po.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {po.items?.length} items
                      </button>
                    </td>
                  </tr>
                  {expanded[po.id] && (
                    <tr key={`${po.id}-items`}>
                      <td colSpan={7} style={{ padding: '0 1rem 1rem', background: '#f8fafc' }}>
                        <table className="data-table" style={{ marginTop: '0.5rem' }}>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Item Name</th>
                              <th>Qty</th>
                              <th>Unit Cost (PKR)</th>
                              <th>Subtotal (PKR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.items.map((item) => (
                              <tr key={item.id}>
                                <td><span className="badge">{item.sku}</span></td>
                                <td>{item.item_name}</td>
                                <td>{item.quantity}</td>
                                <td>PKR {Number(item.unit_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td><strong>PKR {Number(item.quantity * item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CreatePOModal onClose={() => setShowModal(false)} onSuccess={() => { setToast({ message: 'Purchase order created!', type: 'success' }); load(); }} />}
    </div>
  );
}
