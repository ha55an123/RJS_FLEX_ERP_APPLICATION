import { useEffect, useState, useRef } from 'react';
import { getOutlets, getOutletProducts, createSale, getOutletSales } from '../api/outlets';
import { ShoppingCart, Plus, Minus, Trash2, Printer, RefreshCw, Receipt, Package } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const PAYMENT_METHODS = ['cash', 'card', 'online'];

function Bill({ sale, outlet, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Bill</title><style>
      body{font-family:Arial,sans-serif;padding:20px;max-width:320px;margin:auto}
      h2{text-align:center;margin-bottom:4px}p{margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      th,td{padding:6px 4px;font-size:12px;border-bottom:1px solid #eee}
      th{text-align:left;font-weight:600}.right{text-align:right}
      .total{font-weight:700;font-size:14px}.divider{border-top:1px dashed #999;margin:8px 0}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div ref={printRef}>
          <h2 style={{ textAlign: 'center', marginBottom: 4 }}>Foster Garments</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{outlet?.name} · {outlet?.location || ''}</p>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {new Date(sale.created_at).toLocaleString()}
          </p>
          <hr style={{ borderColor: '#e2e8f0', marginBottom: 12 }} />
          {sale.customer_name && <p style={{ fontSize: 13 }}><strong>Customer:</strong> {sale.customer_name}</p>}
          <p style={{ fontSize: 13 }}><strong>Payment:</strong> {sale.payment_method.toUpperCase()}</p>
          <table>
            <thead><tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>PKR {item.unit_price.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>PKR {item.subtotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr style={{ borderColor: '#e2e8f0' }} />
          {sale.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Discount</span><span>- PKR {sale.discount.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginTop: 6 }}>
            <span>Total</span><span>PKR {Number(sale.total_amount).toLocaleString()}</span>
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Thank you for shopping!</p>
        </div>
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={handlePrint}><Printer size={14} /> Print Bill</button>
        </div>
      </div>
    </div>
  );
}

export default function OutletPOSPage() {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [bill, setBill] = useState(null);
  const [sales, setSales] = useState([]);
  const [tab, setTab] = useState('pos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getOutlets().then(({ data }) => setOutlets(data.filter((o) => o.is_active))).catch(() => {});
  }, []);

  const selectOutlet = async (outlet) => {
    setSelectedOutlet(outlet);
    setCart([]);
    try {
      const { data } = await getOutletProducts(outlet.id);
      setProducts(data.filter((p) => p.is_active));
    } catch (err) {
      setProducts([]);
      setToast({ message: err.response?.data?.detail || 'Failed to load products', type: 'error' });
    }
  };

  const loadSales = async () => {
    if (!selectedOutlet) return;
    try { const { data } = await getOutletSales(selectedOutlet.id); setSales(data); } catch {}
  };

  useEffect(() => { if (tab === 'sales') loadSales(); }, [tab, selectedOutlet]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { setToast({ message: 'Insufficient stock', type: 'error' }); return prev; }
        return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock < 1) { setToast({ message: 'Out of stock', type: 'error' }); return prev; }
      return [...prev, { product_id: product.id, sku: product.sku, name: product.name, unit_price: product.sale_price, quantity: 1, stock: product.stock }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev.map((i) => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty < 1) return i;
      if (newQty > i.stock) { setToast({ message: 'Insufficient stock', type: 'error' }); return i; }
      return { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((i) => i.product_id !== productId));

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleCheckout = async () => {
    if (!cart.length) { setToast({ message: 'Cart is empty', type: 'error' }); return; }
    setLoading(true);
    try {
      const { data } = await createSale({
        outlet_id: selectedOutlet.id,
        customer_name: customer || null,
        payment_method: payment,
        discount: parseFloat(discount) || 0,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setCart([]);
      setCustomer('');
      setDiscount(0);
      setBill({ sale: data, outlet: selectedOutlet });
      setToast({ message: 'Sale completed!', type: 'success' });
      const { data: updated } = await getOutletProducts(selectedOutlet.id);
      setProducts(updated.filter((p) => p.is_active));
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Sale failed', type: 'error' });
    } finally { setLoading(false); }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const tabBtn = (key, label, icon) => (
    <button onClick={() => setTab(key)} style={{
      padding: '0.5rem 1.1rem', border: 'none', cursor: 'pointer', fontWeight: 600,
      fontSize: '0.85rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.4rem',
      background: tab === key ? 'var(--primary)' : 'transparent',
      color: tab === key ? '#fff' : 'var(--text-muted)', transition: 'all .15s',
    }}>{icon}{label}</button>
  );

  if (!selectedOutlet) return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header"><h1>Outlet POS</h1><p>Select an outlet to start selling</p></div>
      {outlets.length === 0 ? (
        <div className="empty-state"><ShoppingCart size={48} /><p>No active outlets found. Ask admin to create one.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
          {outlets.map((o) => (
            <div key={o.id} className="kpi-card" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', gap: '0.75rem' }}
              onClick={() => selectOutlet(o)}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={24} color="#4f46e5" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem' }}>{o.name}</p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{o.location || 'No location'}</p>
              </div>
              <span className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.8rem' }}>Open POS →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {bill && <Bill sale={bill.sale} outlet={bill.outlet} onClose={() => setBill(null)} />}

      <div className="page-header">
        <div>
          <h1>POS — {selectedOutlet.name}</h1>
          <p style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setSelectedOutlet(null)}>← Change Outlet</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '0.25rem', gap: '0.2rem' }}>
          {tabBtn('pos', 'Point of Sale', <ShoppingCart size={14} />)}
          {tabBtn('sales', 'Sales History', <Receipt size={14} />)}
        </div>
      </div>

      {tab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
          {/* Products Grid */}
          <div>
            <div className="search-bar" style={{ marginBottom: '1rem' }}>
              <input placeholder="Search products by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filteredProducts.length === 0 ? (
              <div className="empty-state"><Package size={40} /><p>No products available</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.75rem' }}>
                {filteredProducts.map((p) => (
                  <div key={p.id} onClick={() => addToCart(p)} className="kpi-card"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', opacity: p.stock > 0 ? 1 : 0.5, gap: '0.5rem', padding: '1rem', transition: 'transform .15s, box-shadow .15s' }}
                    onMouseEnter={(e) => { if (p.stock > 0) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} color="#4f46e5" />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>{p.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.sku}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--primary)' }}>PKR {Number(p.sale_price).toLocaleString()}</strong>
                      <span className={`qty-badge ${p.stock < 5 ? 'low' : ''}`}>{p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="table-card" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} /> Cart ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>Click products to add them</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {cart.map((item) => (
                  <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PKR {item.unit_price.toLocaleString()} each</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button className="btn-icon" style={{ width: 24, height: 24, padding: 0 }} onClick={() => updateQty(item.product_id, -1)}><Minus size={12} /></button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button className="btn-icon" style={{ width: 24, height: 24, padding: 0 }} onClick={() => updateQty(item.product_id, 1)}><Plus size={12} /></button>
                    </div>
                    <strong style={{ minWidth: 70, textAlign: 'right', fontSize: '0.82rem' }}>PKR {(item.unit_price * item.quantity).toLocaleString()}</strong>
                    <button className="btn-icon-danger" style={{ padding: '0.25rem' }} onClick={() => removeFromCart(item.product_id)}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            <hr style={{ borderColor: 'var(--border)', marginBottom: '0.75rem' }} />

            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Name</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', outline: 'none', marginBottom: '0.6rem' }} />

            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Method</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', outline: 'none', marginBottom: '0.6rem' }}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>

            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount (PKR)</label>
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', outline: 'none', marginBottom: '0.75rem' }} />

            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <span>Subtotal</span><span>PKR {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
                <span>Discount</span><span>- PKR {Number(discount).toLocaleString()}</span>
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                <span>Total</span><span style={{ color: 'var(--primary)' }}>PKR {total.toLocaleString()}</span>
              </div>
            </div>

            <button className="btn-primary full-width" onClick={handleCheckout} disabled={loading || !cart.length} style={{ fontSize: '0.95rem', padding: '0.7rem' }}>
              {loading ? 'Processing…' : <><Receipt size={16} /> Complete Sale</>}
            </button>
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button className="btn-ghost" onClick={loadSales}><RefreshCw size={14} /> Refresh</button>
          </div>
          {sales.length === 0 ? <div className="empty-state"><Receipt size={48} /><p>No sales yet</p></div> : (
            <div className="table-card">
              <table className="data-table">
                <thead><tr><th>#</th><th>Customer</th><th>Payment</th><th>Items</th><th>Discount</th><th>Total</th><th>Date</th><th>Bill</th></tr></thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td><strong>#{s.id}</strong></td>
                      <td>{s.customer_name || <span className="text-muted">Walk-in</span>}</td>
                      <td><span className="status-badge info">{s.payment_method}</span></td>
                      <td>{s.items.length} items</td>
                      <td className="text-muted">{s.discount > 0 ? `PKR ${s.discount}` : '—'}</td>
                      <td><strong>PKR {Number(s.total_amount).toLocaleString()}</strong></td>
                      <td className="text-muted">{new Date(s.created_at).toLocaleString()}</td>
                      <td><button className="btn-icon" onClick={() => setBill({ sale: s, outlet: selectedOutlet })}><Printer size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
