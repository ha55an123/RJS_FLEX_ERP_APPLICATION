import { useEffect, useState } from 'react';
import {
  getOutlets, createOutlet, updateOutlet, deleteOutlet,
  getOutletProducts, addOutletProduct, updateOutletProduct, deleteOutletProduct,
  getOutletSummary,
} from '../api/outlets';
import { PlusCircle, Pencil, Trash2, Store, Package, RefreshCw, ChevronDown, ChevronUp, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';
import Toast from '../components/Toast';

function OutletModal({ outlet, onClose, onSave }) {
  const editing = !!outlet?.id;
  const [form, setForm] = useState({ name: outlet?.name || '', location: outlet?.location || '', phone: outlet?.phone || '', is_active: outlet?.is_active ?? true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Outlet' : 'Add Outlet'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Outlet Name *</label>
          <input value={form.name} onChange={set('name')} placeholder="e.g. Main Branch" required />
          <label>Location</label>
          <input value={form.location} onChange={set('location')} placeholder="e.g. Lahore" />
          <label>Phone</label>
          <input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
          {editing && (
            <><label>Status</label>
            <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}>
              <option value="true">Active</option><option value="false">Inactive</option>
            </select></>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : editing ? 'Save' : 'Create Outlet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductModal({ outletId, product, onClose, onSave }) {
  const editing = !!product?.id;
  const [form, setForm] = useState({ sku: product?.sku || '', name: product?.name || '', description: product?.description || '', sale_price: product?.sale_price || '', stock: product?.stock ?? 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await onSave({ ...form, sale_price: parseFloat(form.sale_price), stock: parseInt(form.stock) }); onClose(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div><label>SKU *</label><input value={form.sku} onChange={set('sku')} required disabled={editing} /></div>
            <div><label>Name *</label><input value={form.name} onChange={set('name')} required /></div>
            <div><label>Sale Price (PKR) *</label><input type="number" min="0" step="0.01" value={form.sale_price} onChange={set('sale_price')} required /></div>
            <div><label>Stock (units)</label><input type="number" min="0" value={form.stock} onChange={set('stock')} /></div>
          </div>
          <label>Description</label>
          <input value={form.description} onChange={set('description')} placeholder="Optional" />
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : editing ? 'Save' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCards({ outletId }) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    getOutletSummary(outletId).then(({ data }) => setSummary(data)).catch(() => {});
  }, [outletId]);
  if (!summary) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem', margin: '0.75rem 0' }}>
      {[
        { label: 'Total Sales', value: summary.total_sales, icon: ShoppingCart, color: '#4f46e5', bg: '#eef2ff' },
        { label: 'Revenue', value: `PKR ${Number(summary.total_revenue).toLocaleString()}`, icon: DollarSign, color: '#059669', bg: '#ecfdf5' },
        { label: 'Products', value: summary.total_products, icon: Package, color: '#0891b2', bg: '#e0f2fe' },
        { label: 'Low Stock', value: summary.low_stock, icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="kpi-card" style={{ padding: '0.75rem' }}>
          <div className="kpi-icon" style={{ background: bg, width: 36, height: 36, borderRadius: 8 }}><Icon size={16} color={color} /></div>
          <div><p className="kpi-label">{label}</p><p style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</p></div>
        </div>
      ))}
    </div>
  );
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [outletModal, setOutletModal] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await getOutlets(); setOutlets(data); } catch {}
    setLoading(false);
  };

  const loadProducts = async (outletId) => {
    try { const { data } = await getOutletProducts(outletId); setProducts((p) => ({ ...p, [outletId]: data })); } catch {}
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    const next = !expanded[id];
    setExpanded((p) => ({ ...p, [id]: next }));
    if (next && !products[id]) await loadProducts(id);
  };

  const handleOutletSave = async (data) => {
    if (outletModal?.id) await updateOutlet(outletModal.id, data);
    else await createOutlet(data);
    setToast({ message: outletModal?.id ? 'Outlet updated' : 'Outlet created', type: 'success' });
    load();
  };

  const handleDeleteOutlet = async (o) => {
    if (!confirm(`Delete outlet "${o.name}"?`)) return;
    try { await deleteOutlet(o.id); setToast({ message: 'Outlet deleted', type: 'success' }); load(); }
    catch (err) { setToast({ message: err.response?.data?.detail || 'Failed', type: 'error' }); }
  };

  const handleProductSave = async (data) => {
    const { outletId, product } = productModal;
    if (product?.id) await updateOutletProduct(outletId, product.id, data);
    else await addOutletProduct(outletId, data);
    setToast({ message: product?.id ? 'Product updated' : 'Product added', type: 'success' });
    loadProducts(outletId);
  };

  const handleDeleteProduct = async (outletId, p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try { await deleteOutletProduct(outletId, p.id); setToast({ message: 'Product deleted', type: 'success' }); loadProducts(outletId); }
    catch (err) { setToast({ message: err.response?.data?.detail || 'Failed', type: 'error' }); }
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>Outlets</h1><p>{outlets.length} outlets registered</p></div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => setOutletModal({})}><PlusCircle size={15} /> New Outlet</button>
        </div>
      </div>

      {loading ? <div className="page-loading">Loading…</div> : outlets.length === 0 ? (
        <div className="empty-state"><Store size={48} /><p>No outlets yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {outlets.map((o) => (
            <div key={o.id} className="table-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={20} color="#4f46e5" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>{o.name}</p>
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>{o.location || '—'} {o.phone ? `· ${o.phone}` : ''}</p>
                  </div>
                  <span className={`status-badge ${o.is_active ? 'success' : 'danger'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setProductModal({ outletId: o.id, product: null })}>
                    <PlusCircle size={13} /> Add Product
                  </button>
                  <button className="btn-icon" onClick={() => setOutletModal(o)}><Pencil size={14} /></button>
                  <button className="btn-icon-danger" onClick={() => handleDeleteOutlet(o)}><Trash2 size={14} /></button>
                  <button className="btn-ghost" style={{ padding: '0.35rem 0.6rem' }} onClick={() => toggle(o.id)}>
                    {expanded[o.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {expanded[o.id] && (
                <div style={{ marginTop: '1rem' }}>
                  <SummaryCards outletId={o.id} />
                  <div className="table-card" style={{ marginTop: '0.5rem', boxShadow: 'none', border: '1px solid var(--border)' }}>
                    <table className="data-table">
                      <thead><tr><th>SKU</th><th>Product</th><th>Sale Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {(products[o.id] || []).length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No products added yet</td></tr>
                        ) : (products[o.id] || []).map((p) => (
                          <tr key={p.id}>
                            <td><span className="badge">{p.sku}</span></td>
                            <td>{p.name}<br /><span className="text-muted" style={{ fontSize: '0.75rem' }}>{p.description || ''}</span></td>
                            <td><strong>PKR {Number(p.sale_price).toLocaleString()}</strong></td>
                            <td><span className={`qty-badge ${p.stock < 5 ? 'low' : ''}`}>{p.stock}</span></td>
                            <td><span className={`status-badge ${p.is_active ? 'success' : 'danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn-icon" onClick={() => setProductModal({ outletId: o.id, product: p })}><Pencil size={13} /></button>
                              <button className="btn-icon-danger" onClick={() => handleDeleteProduct(o.id, p)}><Trash2 size={13} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {outletModal !== null && <OutletModal outlet={outletModal} onClose={() => setOutletModal(null)} onSave={handleOutletSave} />}
      {productModal !== null && <ProductModal outletId={productModal.outletId} product={productModal.product} onClose={() => setProductModal(null)} onSave={handleProductSave} />}
    </div>
  );
}
