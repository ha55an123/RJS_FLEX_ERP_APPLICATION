import { useState, useEffect, useMemo } from 'react';
import { membershipsAPI, membershipPlansAPI } from '../api/gym/memberships';
import { discountsAPI } from '../api/gym/discounts';
import { Plus, Search, RefreshCw, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';

function calcDiscountAmount(discount, baseAmount) {
  if (!discount || !baseAmount) return 0;
  if (discount.discount_type === 'percentage') {
    let amount = baseAmount * discount.discount_value / 100;
    if (discount.max_discount) amount = Math.min(amount, discount.max_discount);
    return Math.round(amount * 100) / 100;
  }
  return Math.min(discount.discount_value, baseAmount);
}

function discountMatchesTarget(discount, targets) {
  const scope = (discount.applicable_to || 'all').toLowerCase();
  return scope === 'all' || targets.includes(scope);
}

export default function MembershipsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [formData, setFormData] = useState({
    member_id: '', plan_id: '', start_date: '', branch_id: '',
    payment_method: 'cash', payment_status: 'paid',
    admission_discount_id: '', monthly_discount_id: '',
    admission_discount_amount: 0, monthly_discount_amount: 0,
  });
  const [planFormData, setPlanFormData] = useState({
    name: '', description: '', duration_type: 'monthly',
    duration_days: 30, price: 0, joining_fee: 0,
    tax_percent: 0, discount_percent: 0,
    admission_discount_percent: 0, monthly_discount_percent: 0,
    freeze_allowed: false, max_freeze_days: 30, auto_renewal: false,
  });
  const [formError, setFormError] = useState('');
  const [planFormError, setPlanFormError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { loadData(); }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === parseInt(formData.plan_id, 10)),
    [plans, formData.plan_id]
  );

  const admissionDiscounts = useMemo(
    () => discounts.filter((d) => d.is_valid && discountMatchesTarget(d, ['joining_fee', 'admission_fee'])),
    [discounts]
  );

  const monthlyDiscounts = useMemo(
    () => discounts.filter((d) => d.is_valid && discountMatchesTarget(d, ['membership', 'monthly_fee'])),
    [discounts]
  );

  const pricingPreview = useMemo(() => {
    if (!selectedPlan) return null;

    const monthlyBase = selectedPlan.price * (1 - (selectedPlan.monthly_discount_percent || selectedPlan.discount_percent || 0) / 100);
    const admissionBase = selectedPlan.joining_fee * (1 - (selectedPlan.admission_discount_percent || 0) / 100);
    const monthlyAfterPromo = Math.max(0, monthlyBase - (formData.monthly_discount_amount || 0));
    const admissionAfterPromo = Math.max(0, admissionBase - (formData.admission_discount_amount || 0));
    const taxAmount = monthlyAfterPromo * (selectedPlan.tax_percent || 0) / 100;

    return {
      monthlyAfterPromo,
      admissionAfterPromo,
      taxAmount,
      total: monthlyAfterPromo + taxAmount + admissionAfterPromo,
    };
  }, [selectedPlan, formData.monthly_discount_amount, formData.admission_discount_amount]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes, discountsRes] = await Promise.all([
        membershipsAPI.getAll(),
        membershipPlansAPI.getAll(),
        discountsAPI.getActive(),
      ]);
      setSubscriptions(subsRes.data?.items || []);
      setPlans(plansRes.data || []);
      setDiscounts(discountsRes.data || []);
      return true;
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        member_id: parseInt(formData.member_id, 10),
        plan_id: parseInt(formData.plan_id, 10),
        branch_id: parseInt(formData.branch_id, 10),
        start_date: formData.start_date,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        admission_discount_amount: Number(formData.admission_discount_amount) || 0,
        monthly_discount_amount: Number(formData.monthly_discount_amount) || 0,
      };

      if (editingSubscription) {
        await membershipsAPI.update(editingSubscription.id, payload);
        await loadData();
        setToast({ message: 'Subscription updated successfully', type: 'success' });
      } else {
        const response = await membershipsAPI.create(payload);
        const refreshed = await loadData();
        // The POST response is the persisted record. Keep the UI truthful and
        // immediately usable if a transient list request fails after creation.
        if (!refreshed && response.data?.id) {
          setSubscriptions((current) => [
            response.data,
            ...current.filter((subscription) => subscription.id !== response.data.id),
          ]);
        }
        setToast({ message: 'Subscription created successfully', type: 'success' });
      }
      setShowModal(false);
      setEditingSubscription(null);
      setFormData({
        member_id: '', plan_id: '', start_date: '', branch_id: '',
        payment_method: 'cash', payment_status: 'paid',
        admission_discount_id: '', monthly_discount_id: '',
        admission_discount_amount: 0, monthly_discount_amount: 0,
      });
      // Discount analytics must not prevent a committed subscription from
      // appearing. The subscription request and list refresh above are awaited.
      const usageUpdates = [formData.admission_discount_id, formData.monthly_discount_id]
        .filter(Boolean)
        .map((id) => discountsAPI.incrementUsage(id));
      if (usageUpdates.length) {
        Promise.allSettled(usageUpdates).then((results) => {
          if (results.some((result) => result.status === 'rejected')) {
            console.warn('Subscription saved, but discount usage could not be updated');
          }
        });
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save subscription';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setPlanFormError('');
    setSubmittingPlan(true);
    try {
      if (editingPlan) {
        await membershipPlansAPI.update(editingPlan.id, planFormData);
        setToast({ message: 'Plan updated successfully', type: 'success' });
      } else {
        await membershipPlansAPI.create(planFormData);
        setToast({ message: 'Plan created successfully', type: 'success' });
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanFormData({
        name: '', description: '', duration_type: 'monthly', duration_days: 30,
        price: 0, joining_fee: 0, tax_percent: 0, discount_percent: 0,
        admission_discount_percent: 0, monthly_discount_percent: 0,
        freeze_allowed: false, max_freeze_days: 30, auto_renewal: false,
      });
      loadData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save plan';
      setPlanFormError(msg);
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleRenew = async (id) => {
    try {
      await membershipsAPI.renew(id, { payment_method: 'cash' });
      setToast({ message: 'Subscription renewed successfully', type: 'success' });
      loadData();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || 'Failed to renew subscription', type: 'error' });
    }
  };

  const handleFreeze = async (id) => {
    const reason = prompt('Enter freeze reason:');
    if (reason) {
      try {
        await membershipsAPI.freeze(id, { reason, freeze_days: 30 });
        setToast({ message: 'Subscription frozen successfully', type: 'success' });
        loadData();
      } catch (error) {
        setToast({ message: error.response?.data?.detail || 'Failed to freeze subscription', type: 'error' });
      }
    }
  };

  const handleUnfreeze = async (id) => {
    try {
      await membershipsAPI.unfreeze(id);
      setToast({ message: 'Subscription unfrozen successfully', type: 'success' });
      loadData();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || 'Failed to unfreeze subscription', type: 'error' });
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (window.confirm('Delete this subscription?')) {
      try {
        await membershipsAPI.delete(id);
        setToast({ message: 'Subscription deleted successfully', type: 'success' });
        loadData();
      } catch (error) {
        setToast({ message: error.response?.data?.detail || 'Failed to delete subscription', type: 'error' });
      }
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Delete this plan?')) {
      try {
        await membershipPlansAPI.delete(id);
        setToast({ message: 'Plan deleted successfully', type: 'success' });
        loadData();
      } catch (error) {
        setToast({ message: error.response?.data?.detail || 'Failed to delete plan', type: 'error' });
      }
    }
  };

  const filteredSubscriptions = subscriptions.filter(s =>
    `${s.member_name || ''} ${s.member_code || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPlans = plans.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="page-loading">Loading memberships...</div>;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Memberships</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowPlanModal(true)} className="btn-secondary">
            <Plus size={18} /> Add Plan
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Add Subscription
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setActiveTab('subscriptions')} className={`gm-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}>Subscriptions</button>
          <button onClick={() => setActiveTab('plans')} className={`gm-tab ${activeTab === 'plans' ? 'active' : ''}`}>Plans</button>
        </div>
        <div className="gm-search">
          <Search size={16} />
          <input type="text" placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {activeTab === 'subscriptions' ? (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th><th>Plan</th><th>Start Date</th>
                <th>End Date</th><th>Status</th><th>Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.member_name || '-'}</td>
                  <td>{sub.plan_name || '-'}</td>
                  <td>{sub.start_date || '-'}</td>
                  <td>{sub.end_date || '-'}</td>
                  <td>
                    <span className={`status-badge ${sub.status === 'active' ? 'success' : sub.status === 'expired' ? 'danger' : sub.status === 'frozen' ? 'neutral' : 'warning'}`}>
                      {sub.status || 'Unknown'}
                    </span>
                  </td>
                  <td>PKR {(sub.total_amount || 0).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleRenew(sub.id)} className="icon-btn" title="Renew"><RefreshCw size={16} /></button>
                      {sub.status === 'active'
                        ? <button onClick={() => handleFreeze(sub.id)} className="icon-btn" title="Freeze"><PauseCircle size={16} /></button>
                        : <button onClick={() => handleUnfreeze(sub.id)} className="icon-btn" title="Unfreeze"><PlayCircle size={16} /></button>
                      }
                      <button onClick={() => handleDeleteSubscription(sub.id)} className="icon-btn icon-btn-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSubscriptions.length === 0 && (
            <div className="empty-state">
              {subscriptions.length ? 'No subscriptions match the current search' : 'No subscriptions found'}
            </div>
          )}
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Duration</th><th>Price</th><th>Monthly Disc.</th><th>Joining Fee</th><th>Admission Disc.</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.duration_days || 0} days</td>
                  <td>PKR {(plan.price || 0).toLocaleString()}</td>
                  <td>{plan.monthly_discount_percent || plan.discount_percent || 0}%</td>
                  <td>PKR {(plan.joining_fee || 0).toLocaleString()}</td>
                  <td>{plan.admission_discount_percent || 0}%</td>
                  <td><span className={`status-badge ${plan.is_active ? 'success' : 'danger'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button onClick={() => handleDeletePlan(plan.id)} className="icon-btn icon-btn-danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPlans.length === 0 && <div className="empty-state">No plans found</div>}
        </div>
      )}

      {/* Add Subscription Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="gm-modal" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem' }}>
            <h2>{editingSubscription ? 'Edit Subscription' : 'Add Subscription'}</h2>
            <form onSubmit={handleSubscriptionSubmit}>
              <div className="gm-field">
                <label>Member ID *</label>
                <input type="text" required value={formData.member_id}
                  onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                  placeholder="Enter member ID" />
              </div>
              <div className="gm-field">
                <label>Plan *</label>
                <select required value={formData.plan_id}
                  onChange={(e) => setFormData({...formData, plan_id: e.target.value})}>
                  <option value="">Select Plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} — PKR {plan.price}</option>
                  ))}
                </select>
              </div>
              <div className="gm-field">
                <label>Branch ID *</label>
                <input type="number" required min="1" value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  placeholder="Enter branch ID" />
              </div>
              <div className="gm-field">
                <label>Start Date *</label>
                <input type="date" required value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  style={{ colorScheme: 'dark' }} />
              </div>
              <div className="gm-field">
                <label>Payment Method</label>
                <select value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easy_paisa">EasyPaisa</option>
                </select>
              </div>
              <div className="gm-field">
                <label>Admission Fee Discount (Optional)</label>
                <select value={formData.admission_discount_id}
                  onChange={(e) => {
                    const discountId = e.target.value;
                    const discount = admissionDiscounts.find((d) => d.id === parseInt(discountId, 10));
                    const baseAmount = selectedPlan?.joining_fee || 0;
                    setFormData({
                      ...formData,
                      admission_discount_id: discountId,
                      admission_discount_amount: discount ? calcDiscountAmount(discount, baseAmount) : 0,
                    });
                  }}>
                  <option value="">No Admission Discount</option>
                  {admissionDiscounts.map((discount) => (
                    <option key={discount.id} value={discount.id}>
                      {discount.name} — {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `PKR ${discount.discount_value}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gm-field">
                <label>Monthly Fee Discount (Optional)</label>
                <select value={formData.monthly_discount_id}
                  onChange={(e) => {
                    const discountId = e.target.value;
                    const discount = monthlyDiscounts.find((d) => d.id === parseInt(discountId, 10));
                    const baseAmount = selectedPlan?.price || 0;
                    setFormData({
                      ...formData,
                      monthly_discount_id: discountId,
                      monthly_discount_amount: discount ? calcDiscountAmount(discount, baseAmount) : 0,
                    });
                  }}>
                  <option value="">No Monthly Discount</option>
                  {monthlyDiscounts.map((discount) => (
                    <option key={discount.id} value={discount.id}>
                      {discount.name} — {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `PKR ${discount.discount_value}`}
                    </option>
                  ))}
                </select>
              </div>
              {pricingPreview && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>Monthly after discounts: PKR {pricingPreview.monthlyAfterPromo.toLocaleString()}</div>
                  <div>Admission after discounts: PKR {pricingPreview.admissionAfterPromo.toLocaleString()}</div>
                  <div>Tax: PKR {Math.round(pricingPreview.taxAmount).toLocaleString()}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: '0.35rem' }}>
                    Total: PKR {Math.round(pricingPreview.total).toLocaleString()}
                  </div>
                </div>
              )}
              {formError && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="gm-btn-cancel" onClick={() => { setShowModal(false); setEditingSubscription(null); }}>Cancel</button>
                <button type="submit" className="gm-btn-submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showPlanModal && (
        <div className="modal-overlay">
          <div className="gm-modal" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingPlan ? 'Edit Plan' : 'Add Membership Plan'}</h2>
            <form onSubmit={handlePlanSubmit}>
              <div className="gm-field">
                <label>Name *</label>
                <input type="text" required value={planFormData.name}
                  onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})}
                  placeholder="e.g. Monthly Basic" />
              </div>
              <div className="gm-field">
                <label>Description</label>
                <textarea value={planFormData.description} rows={2}
                  onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})}
                  placeholder="Optional description" />
              </div>
              <div className="gm-field">
                <label>Duration Type</label>
                <select value={planFormData.duration_type}
                  onChange={(e) => setPlanFormData({...planFormData, duration_type: e.target.value})}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="gm-field">
                <label>Duration Days *</label>
                <input type="number" required value={planFormData.duration_days}
                  onChange={(e) => setPlanFormData({...planFormData, duration_days: parseInt(e.target.value)})} />
              </div>
              <div className="gm-field">
                <label>Price (PKR) *</label>
                <input type="number" required value={planFormData.price}
                  onChange={(e) => setPlanFormData({...planFormData, price: parseFloat(e.target.value)})} />
              </div>
              <div className="gm-field">
                <label>Joining Fee / Admission Fee (PKR)</label>
                <input type="number" value={planFormData.joining_fee}
                  onChange={(e) => setPlanFormData({...planFormData, joining_fee: parseFloat(e.target.value)})} />
              </div>
              <div className="gm-field">
                <label>Monthly Fee Discount (%)</label>
                <input type="number" min="0" max="100" step="0.01"
                  value={planFormData.monthly_discount_percent}
                  onChange={(e) => setPlanFormData({ ...planFormData, monthly_discount_percent: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="gm-field">
                <label>Admission Fee Discount (%)</label>
                <input type="number" min="0" max="100" step="0.01"
                  value={planFormData.admission_discount_percent}
                  onChange={(e) => setPlanFormData({ ...planFormData, admission_discount_percent: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="gm-field">
                <label className="gm-check-label">
                  <input type="checkbox" checked={planFormData.freeze_allowed}
                    onChange={(e) => setPlanFormData({...planFormData, freeze_allowed: e.target.checked})}
                    style={{ width: 'auto', padding: 0 }} />
                  Allow Freeze
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="gm-btn-cancel" onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}>Cancel</button>
                <button type="submit" className="gm-btn-submit gm-btn-submit-purple">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
