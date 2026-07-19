import { useEffect, useState } from 'react';
import { getAllOrders, getMyOrders, placeOrder } from '../api/orders';
import { getInventory } from '../api/inventory';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, ShoppingCart, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';

function PlaceOrderModal({ onClose, onSuccess }) {
  const [inventory, setInventory] = useState([]);
  const [items, setItems] = useState([{ sku: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getInventory().then(({ data }) => setInventory(data)).catch(() => {});
  }, []);

  const addLine = () => setItems((prev) => [...prev, { sku: '', quantity: 1 }]);
  const removeLine = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const setLine = (i, k, v) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = items.filter((i) => i.sku && i.quantity > 0);
    if (!valid.length) return;
    setLoading(true);
    try {
      await placeOrder(valid.map((i) => ({ sku: i.sku, quantity: parseInt(i.quantity) })));
      onSuccess();
      onClose();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Order failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3>Place New Order</h3>
        <form onSubmit={handleSubmit}>
          <div className="order-lines">
            {items.map((item, i) => (
              <div key={i} className="order-line">
                <select
                  value={item.sku}
                  onChange={(e) => setLine(i, 'sku', e.target.value)}
                  required
                >
                  <option value="">Select SKU…</option>
                  {inventory.map((inv) => (
                    <option key={inv.sku} value={inv.sku}>
                      {inv.sku} – {inv.name} (stock: {inv.quantity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => setLine(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  required
                />
                {items.length > 1 && (
                  <button type="button" className="btn-icon-danger" onClick={() => removeLine(i)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost" onClick={addLine} style={{ marginBottom: '1rem' }}>
            + Add Item
          </button>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_CLASS = { confirmed: 'success', pending: 'warning', cancelled: 'danger', shipped: 'info' };

export default function OrdersPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'company_manager'].includes(user?.role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = isManager ? await getAllOrders() : await getMyOrders();
      setOrders(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSuccess = () => {
    setToast({ message: 'Order placed successfully!', type: 'success' });
    load();
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} {isManager ? 'total' : 'your'} orders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={15} /> Place Order
        </button>
      </div>

      {loading ? (
        <div className="page-loading">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                {isManager && <th>User ID</th>}
                <th>Total Amount (PKR)</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  {isManager && <td>{o.user_id}</td>}
                  <td><strong>PKR {Number(o.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>
                    <span className={`status-badge ${STATUS_CLASS[o.status] || ''}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="text-muted">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <PlaceOrderModal onClose={() => setShowModal(false)} onSuccess={onSuccess} />}
    </div>
  );
}
