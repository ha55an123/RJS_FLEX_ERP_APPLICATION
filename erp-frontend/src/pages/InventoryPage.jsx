import { useEffect, useState } from 'react';
import { getInventory, createInventoryItem, addStock, removeStock } from '../api/inventory';
import { PlusCircle, MinusCircle, RefreshCw, Package } from 'lucide-react';
import Toast from '../components/Toast';

function ItemModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    sku: '', name: '', description: '', quantity: '', unit_price: '', location: 'warehouse',
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      quantity: parseInt(form.quantity) || 0,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      location: form.location.trim() || 'warehouse',
    });
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Inventory Item</h3>
        <form onSubmit={handle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div><label>SKU *</label><input value={form.sku} onChange={set('sku')} placeholder="e.g. SKU-001" required /></div>
            <div><label>Name *</label><input value={form.name} onChange={set('name')} placeholder="Product name" required /></div>
            <div><label>Initial Quantity</label><input type="number" min="0" value={form.quantity} onChange={set('quantity')} placeholder="0" /></div>
            <div><label>Unit Price (PKR)</label><input type="number" min="0" step="0.01" value={form.unit_price} onChange={set('unit_price')} placeholder="Optional" /></div>
          </div>
          <label>Location</label>
          <input value={form.location} onChange={set('location')} placeholder="e.g. warehouse" required />
          <label>Description</label>
          <input value={form.description} onChange={set('description')} placeholder="Optional" />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ mode, onClose, onSubmit }) {
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(sku, parseInt(qty), location);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add Stock' : 'Remove Stock'}</h3>
        <form onSubmit={handle}>
          <label>SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SKU-001" required />
          <label>Quantity</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
          <label>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. warehouse-1" required />
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className={mode === 'add' ? 'btn-primary' : 'btn-danger'} disabled={loading}>
              {loading ? 'Processing…' : mode === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getInventory();
      setItems(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStock = async (mode, sku, qty, location) => {
    try {
      if (mode === 'add') await addStock(sku, qty, location);
      else await removeStock(sku, qty, location);
      setModal(null);
      setToast({ message: `Stock ${mode === 'add' ? 'added' : 'removed'} successfully`, type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Operation failed', type: 'error' });
    }
  };

  const handleCreateItem = async (data) => {
    try {
      await createInventoryItem(data);
      setModal(null);
      setToast({ message: 'Item created successfully', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to create item', type: 'error' });
    }
  };

  const filtered = items.filter(
    (i) =>
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>{items.length} items tracked</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-danger-outline" onClick={() => setModal('remove')}>
            <MinusCircle size={15} /> Remove Stock
          </button>
          <button className="btn-ghost" onClick={() => setModal('item')}>
            <Package size={15} /> Add Item
          </button>
          <button className="btn-primary" onClick={() => setModal('add')}>
            <PlusCircle size={15} /> Add Stock
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          placeholder="Search by SKU or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loading">Loading inventory…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>No inventory items found</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price (PKR)</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><span className="badge">{item.sku}</span></td>
                  <td>{item.name}</td>
                  <td className="text-muted">{item.description || '—'}</td>
                  <td>
                    <span className={`qty-badge ${item.quantity < 10 ? 'low' : ''}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td>{item.unit_price != null ? `PKR ${Number(item.unit_price).toLocaleString()}` : '—'}</td>
                  <td>{item.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'item' && (
        <ItemModal onClose={() => setModal(null)} onSubmit={handleCreateItem} />
      )}
      {(modal === 'add' || modal === 'remove') && (
        <StockModal
          mode={modal}
          onClose={() => setModal(null)}
          onSubmit={(sku, qty, loc) => handleStock(modal, sku, qty, loc)}
        />
      )}
    </div>
  );
}
