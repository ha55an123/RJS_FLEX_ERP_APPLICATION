import { useState, useEffect } from 'react';
import { inventoryAPI } from '../api/gym/inventory';
import { Plus, Search, Edit, Trash2, Package, AlertCircle } from 'lucide-react';
import Toast from '../components/Toast';

const EMPTY_FORM = {
  name: '',
  category: '',
  sku: '',
  description: '',
  quantity: 0,
  min_stock_level: 10,
  unit_price: 0,
  supplier: '',
};

export default function GymInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  const [adjustFormData, setAdjustFormData] = useState({
    adjustment_type: 'add',
    quantity: 0,
    reason: '',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getAll({ page_size: 100 });
      setInventory(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setToast({ message: error.response?.data?.detail || 'Failed to load inventory', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description || null,
      purchase_price: Number(formData.unit_price) || 0,
      minimum_stock: Number(formData.min_stock_level) || 0,
      supplier_name: formData.supplier || null,
      quantity: Number(formData.quantity) || 0,
    };

    if (formData.sku.trim()) {
      payload.sku = formData.sku.trim();
    }

    try {
      if (editingItem) {
        await inventoryAPI.update(editingItem.id, payload);
        setToast({ message: 'Inventory item updated successfully', type: 'success' });
      } else {
        await inventoryAPI.create(payload);
        setToast({ message: 'Inventory item created successfully', type: 'success' });
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      await loadInventory();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save inventory item';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.adjustStock(selectedItemForAdjust.id, {
        transaction_type: adjustFormData.adjustment_type === 'remove' ? 'sale' : 'adjustment',
        quantity: Number(adjustFormData.quantity),
        notes: adjustFormData.reason,
      });
      setToast({ message: 'Stock adjusted successfully', type: 'success' });
      setShowAdjustModal(false);
      setSelectedItemForAdjust(null);
      setAdjustFormData({ adjustment_type: 'add', quantity: 0, reason: '' });
      await loadInventory();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || 'Failed to adjust stock', type: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || '',
      sku: item.sku || '',
      description: item.description || '',
      quantity: item.quantity ?? 0,
      min_stock_level: item.min_stock_level ?? item.minimum_stock ?? 10,
      unit_price: item.unit_price ?? item.purchase_price ?? 0,
      supplier: item.supplier ?? item.supplier_name ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      await inventoryAPI.delete(id);
      setToast({ message: 'Inventory item deleted', type: 'success' });
      await loadInventory();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || 'Failed to delete inventory item', type: 'error' });
    }
  };

  const handleAdjustStock = (item) => {
    setSelectedItemForAdjust(item);
    setShowAdjustModal(true);
  };

  const filteredInventory = inventory.filter((i) =>
    `${i.name} ${i.sku || ''} ${i.category || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter((i) => (i.quantity ?? 0) <= (i.min_stock_level ?? i.minimum_stock ?? 0));

  if (loading) return <div className="page-loading">Loading inventory...</div>;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Gym Inventory</h1>
          <p>{inventory.length} item{inventory.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={() => { resetForm(); setEditingItem(null); setShowModal(true); }} className="btn-primary">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <AlertCircle size={18} />
          <span>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's are' : ' is'} low on stock</span>
        </div>
      )}

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search inventory by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Min Level</th>
              <th>Unit Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => {
              const minLevel = item.min_stock_level ?? item.minimum_stock ?? 0;
              const isLow = (item.quantity ?? 0) <= minLevel;
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.sku || '-'}</td>
                  <td className="capitalize">{item.category || '-'}</td>
                  <td>{item.quantity ?? 0}</td>
                  <td>{minLevel}</td>
                  <td>PKR {(item.unit_price ?? item.purchase_price ?? 0).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${isLow ? 'danger' : 'success'}`}>
                      {isLow ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleAdjustStock(item)} className="icon-btn" title="Adjust Stock">
                        <Package size={16} />
                      </button>
                      <button onClick={() => handleEdit(item)} className="icon-btn" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="icon-btn icon-btn-danger" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredInventory.length === 0 && <div className="empty-state">No inventory items found</div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }} className="icon-btn">×</button>
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
                    <label>Name *</label>
                    <input type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Whey Protein 2kg" />
                  </div>
                  <div className="form-group">
                    <label>SKU {!editingItem && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-generated if empty)</span>}</label>
                    <input type="text" value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select required value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Select Category</option>
                      <option value="supplements">Supplements</option>
                      <option value="apparel">Apparel</option>
                      <option value="accessories">Accessories</option>
                      <option value="equipment_parts">Equipment Parts</option>
                      <option value="cleaning">Cleaning Supplies</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {!editingItem && (
                    <div className="form-group">
                      <label>Initial Quantity *</label>
                      <input type="number" required min="0" value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Min Stock Level *</label>
                    <input type="number" required min="0" value={formData.min_stock_level}
                      onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value, 10) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Unit Price (PKR)</label>
                    <input type="number" min="0" step="0.01" value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Supplier</label>
                    <input type="text" value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="Supplier name" />
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea value={formData.description} rows={2}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : `${editingItem ? 'Update' : 'Create'} Item`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdjustModal && selectedItemForAdjust && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Adjust Stock</h2>
              <button onClick={() => { setShowAdjustModal(false); setSelectedItemForAdjust(null); }} className="icon-btn">×</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {selectedItemForAdjust.name} — Current: {selectedItemForAdjust.quantity ?? 0}
            </p>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Adjustment Type</label>
                  <select value={adjustFormData.adjustment_type}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, adjustment_type: e.target.value })}>
                    <option value="add">Add Stock</option>
                    <option value="remove">Remove Stock</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" required min="1" value={adjustFormData.quantity}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, quantity: parseInt(e.target.value, 10) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Reason *</label>
                  <textarea required rows={2} value={adjustFormData.reason}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowAdjustModal(false); setSelectedItemForAdjust(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Adjust Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
