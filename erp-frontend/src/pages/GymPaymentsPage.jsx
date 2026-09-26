import { useState, useEffect } from 'react';
import { paymentsAPI } from '../api/gym/payments';
import { membershipPlansAPI } from '../api/gym/memberships';
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, User, Printer } from 'lucide-react';
import Toast from '../components/Toast';
import MemberSearchSelect from '../components/MemberSearchSelect';

export default function GymPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberError, setMemberError] = useState('');
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [formData, setFormData] = useState({
    member_id: '',
    amount: 0,
    registration_fee: 0,
    discount_amount: 0,
    payment_method: 'cash',
    payment_type: 'membership',
    status: 'paid',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0],
    plan_id: '',
  });
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(true);

  useEffect(() => {
    loadData();
    loadMembershipPlans();
  }, []);

  useEffect(() => {
    if (formData.payment_type === 'membership' && formData.plan_id) {
      const selectedPlan = membershipPlans.find(p => p.id === Number(formData.plan_id));
      if (selectedPlan) {
        setFormData(prev => ({
          ...prev,
          amount: selectedPlan.price,
          registration_fee: selectedPlan.joining_fee || 0
        }));
      }
    }
  }, [formData.plan_id, formData.payment_type, membershipPlans]);

  const loadData = async () => {
    setLoading(true);
    try {
      const paymentsRes = await paymentsAPI.getAll({ page_size: 100 });
      setPayments(paymentsRes.data?.items || paymentsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadMembershipPlans = async () => {
    try {
      const plansRes = await membershipPlansAPI.getAll();
      setMembershipPlans(plansRes.data || []);
    } catch (error) {
      console.error('Failed to load membership plans:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: 0,
      registration_fee: 0,
      discount_amount: 0,
      payment_method: 'cash',
      payment_type: 'membership',
      status: 'paid',
      notes: '',
      payment_date: new Date().toISOString().split('T')[0],
      plan_id: '',
    });
    setSelectedMember(null);
    setMemberError('');
    setFormError('');
    setPrintReceipt(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setMemberError('');

    if (!formData.member_id) {
      setMemberError('Please select a member.');
      return;
    }
    if (!selectedMember?.branch_id) {
      setMemberError('Selected member must have an assigned branch.');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (Number(formData.discount_amount) < 0) {
      setFormError('Discount cannot be negative.');
      return;
    }
    if (Number(formData.discount_amount) > Number(formData.amount)) {
      setFormError('Discount cannot be greater than the payment amount.');
      return;
    }

    setSubmitting(true);
    const receiptWindow = !editingPayment && printReceipt ? window.open('', '_blank') : null;
    try {
      const payload = {
        member_id: Number(formData.member_id),
        branch_id: editingPayment?.branch_id || selectedMember.branch_id,
        amount: Number(formData.amount) + Number(formData.registration_fee),
        discount_amount: Number(formData.discount_amount) || 0,
        payment_method: formData.payment_method,
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        notes: formData.notes || null,
      };

      // Store plan and registration fee info in notes for membership payments to display on receipt
      if (formData.payment_type === 'membership' && formData.plan_id) {
        const plan = membershipPlans.find(p => p.id === Number(formData.plan_id));
        if (plan) {
          const planInfo = `Plan: ${plan.name} (ID: ${plan.id})`;
          const regFeeInfo = formData.registration_fee > 0 ? ` | Reg Fee: ${formData.registration_fee}` : '';
          payload.notes = formData.notes 
            ? `${formData.notes} | ${planInfo}${regFeeInfo}`
            : `${planInfo}${regFeeInfo}`;
        }
      }

      if (editingPayment) {
        await paymentsAPI.update(editingPayment.id, {
          ...payload,
          status: formData.status,
        });
        setToast({ message: 'Payment updated successfully', type: 'success' });
      } else {
        const response = await paymentsAPI.create(payload);
        if (receiptWindow) handlePrintReceipt(response.data, selectedMember, receiptWindow);
        setToast({ message: 'Payment recorded successfully', type: 'success' });
      }
      setShowModal(false);
      setEditingPayment(null);
      resetForm();
      loadData();
    } catch (error) {
      receiptWindow?.close();
      const detail = error.response?.data?.detail || error.message;
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : 'Failed to save payment';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      member_id: payment.member_id || '',
      amount: payment.amount || 0,
      registration_fee: 0,
      discount_amount: payment.discount_amount || 0,
      payment_method: payment.payment_method || 'cash',
      payment_type: payment.payment_type || 'membership',
      status: payment.status || 'paid',
      notes: payment.notes || '',
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      plan_id: '',
    });
    setSelectedMember(null);
    setMemberError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentsAPI.delete(id);
        setToast({ message: 'Payment deleted successfully', type: 'success' });
        loadData();
      } catch (error) {
        setToast({ message: error.response?.data?.detail || 'Failed to delete payment', type: 'error' });
      }
    }
  };

  const handlePrintReceipt = (payment, knownMember, existingWindow) => {
    const member = knownMember;
    const printWindow = existingWindow || window.open('', '_blank');
    if (!printWindow) {
      setToast({ message: 'Allow popups to print the receipt', type: 'error' });
      return;
    }

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char]));
    const memberName = payment.member_name || (member ? `${member.first_name} ${member.last_name}` : 'N/A');
    const memberCode = payment.member_code || member?.member_code || 'N/A';

    // Use actual payment timestamp converted to Asia/Karachi timezone
    const paymentTimestamp = payment.created_at ? new Date(payment.created_at) : new Date();
    const currentDate = paymentTimestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Karachi' });
    const currentTime = paymentTimestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });
    const discount = payment.discount_amount || 0;
    const subtotal = payment.amount || 0;
    const total = payment.total_amount || payment.amount || 0;

    // Get plan details if available (from notes field)
    let planName = '';
    let registrationFee = 0;
    if (payment.notes && payment.notes.includes('Plan:')) {
      const planMatch = payment.notes.match(/Plan:\s*([^|]+)/);
      if (planMatch) {
        planName = planMatch[1].trim();
      }
      const regFeeMatch = payment.notes.match(/Reg Fee:\s*(\d+(?:\.\d+)?)/);
      if (regFeeMatch) {
        registrationFee = parseFloat(regFeeMatch[1]) || 0;
      }
    }

    // Calculate membership amount (total - registration fee)
    const membershipAmount = registrationFee > 0 ? subtotal - registrationFee : subtotal;

    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Payment Receipt</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm 297mm;
            margin: 0;
          }
          @media print {
            @page {
              size: 80mm 297mm;
              margin: 0;
            }
            body {
              width: 80mm;
              margin: 0;
              padding: 2mm;
              font-size: 10px;
              font-family: Arial, sans-serif;
            }
          }
          body {
            font-family: Arial, sans-serif;
            width: 80mm;
            margin: 0;
            padding: 2mm;
            font-size: 10px;
            background: white;
          }
          .logo {
            text-align: center;
            margin-bottom: 2px;
          }
          .logo img {
            max-width: 50mm;
            height: auto;
          }
          .business-name {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 2px 0;
            text-transform: uppercase;
          }
          .receipt-title {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin: 2px 0;
            text-transform: uppercase;
          }
          .receipt-number {
            text-align: center;
            font-size: 9px;
            margin: 2px 0;
          }
          .contact-info {
            text-align: center;
            font-size: 8px;
            margin: 4px 0;
            line-height: 1.3;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .section-title {
            font-size: 9px;
            font-weight: bold;
            margin: 4px 0 3px 0;
            text-transform: uppercase;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            line-height: 1.3;
          }
          .row span:first-child {
            font-weight: 600;
            font-size: 9px;
          }
          .row span:last-child {
            text-align: right;
            font-size: 9px;
          }
          .amount-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            line-height: 1.3;
          }
          .amount-row span:last-child {
            font-weight: bold;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            padding-top: 4px;
            border-top: 2px solid #000;
            font-size: 12px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 8px;
            font-size: 8px;
            line-height: 1.3;
          }
          .footer p {
            margin: 2px 0;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head><body>
        <div class="logo">
          <img src="/rjs-billrecipt-logo.jpeg" alt="RJS Flex Gym Logo" />
        </div>
        <div class="business-name">RJS Flex Gym</div>
        <div class="receipt-title">PAYMENT RECEIPT</div>
        <div class="receipt-number">#${escapeHtml(payment.payment_number || payment.id)}</div>
        <div class="contact-info">
          <p>Plot no Y 266, Y Area Korangi No 1½</p>
          <p>03140352988 | 03170029897</p>
        </div>
        <div class="divider"></div>
        <div class="section-title">Customer Details</div>
        <div class="row"><span>Member:</span><span>${escapeHtml(memberName)}</span></div>
        <div class="row"><span>Member ID:</span><span>${escapeHtml(memberCode)}</span></div>
        <div class="divider"></div>
        <div class="section-title">Payment Details</div>
        <div class="row"><span>Date:</span><span>${escapeHtml(currentDate)}</span></div>
        <div class="row"><span>Time:</span><span>${escapeHtml(currentTime)}</span></div>
        <div class="row"><span>Type:</span><span>${escapeHtml(payment.payment_type)}</span></div>
        ${planName ? `<div class="row"><span>Plan:</span><span>${escapeHtml(planName)}</span></div>` : ''}
        <div class="row"><span>Method:</span><span>${escapeHtml(payment.payment_method)}</span></div>
        <div class="divider"></div>
        <div class="section-title">Amount</div>
        ${registrationFee > 0 ? `
          <div class="amount-row"><span>Membership:</span><span>PKR ${Number(membershipAmount).toLocaleString()}</span></div>
          <div class="amount-row"><span>Registration Fee:</span><span>PKR ${Number(registrationFee).toLocaleString()}</span></div>
          <div class="amount-row"><span>Subtotal:</span><span>PKR ${Number(subtotal).toLocaleString()}</span></div>
        ` : `
          <div class="amount-row"><span>Subtotal:</span><span>PKR ${Number(subtotal).toLocaleString()}</span></div>
        `}
        ${discount > 0 ? `<div class="amount-row"><span>Discount:</span><span>-PKR ${Number(discount).toLocaleString()}</span></div>` : ''}
        <div class="total-row"><span>TOTAL:</span><span>PKR ${Number(total).toLocaleString()}</span></div>
        <div class="divider"></div>
        <div class="footer">
          <p style="font-weight: bold; font-size: 9px; margin: 6px 0;">ALL FUNDS ARE NON REFUNDABLE</p>
          <p>Thank you for your payment!</p>
          <p>RJS Flex Gym</p>
          <p>www.rjsflexgym.com</p>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const filteredPayments = payments.filter((p) => {
    const haystack = `${p.member_name || ''} ${p.member_code || ''} ${p.payment_type || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) return <div className="page-loading">Loading payments...</div>;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Financial payment records</p>
        </div>
        <button onClick={() => { resetForm(); setEditingPayment(null); setShowModal(true); }} className="btn-primary">
          <Plus size={18} /> Add Payment
        </button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="kpi-card">
          <DollarSign size={22} style={{ color: 'var(--primary)' }} />
          <div><p>Total Collected</p><h3>PKR {totalAmount.toLocaleString()}</h3></div>
        </div>
        <div className="kpi-card">
          <Calendar size={22} style={{ color: 'var(--primary)' }} />
          <div><p>Transactions</p><h3>{filteredPayments.length}</h3></div>
        </div>
        <div className="kpi-card">
          <User size={22} style={{ color: 'var(--primary)' }} />
          <div><p>Members Paid</p><h3>{new Set(filteredPayments.map((p) => p.member_id)).size}</h3></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by member name or Member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="gm-field-select">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Type</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.payment_date || '-'}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{payment.member_name || '-'}</div>
                  {payment.member_code && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>{payment.member_code}</div>
                  )}
                </td>
                <td className="capitalize">{payment.payment_type || '-'}</td>
                <td className="capitalize">{payment.payment_method || '-'}</td>
                <td>PKR {(payment.amount || 0).toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${
                    payment.status === 'paid' ? 'success' :
                    payment.status === 'pending' ? 'warning' :
                    payment.status === 'refunded' ? 'danger' : 'neutral'
                  }`}>
                    {payment.status || 'Unknown'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handlePrintReceipt(payment)} className="icon-btn" title="Print Receipt">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => handleEdit(payment)} className="icon-btn" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(payment.id)} className="icon-btn icon-btn-danger" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && <div className="empty-state">No payments found</div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>{editingPayment ? 'Edit Payment' : 'Add New Payment'}</h2>
              <button onClick={() => { setShowModal(false); setEditingPayment(null); resetForm(); }} className="icon-btn">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}

                <MemberSearchSelect
                  value={formData.member_id}
                  onChange={(memberId) => setFormData((prev) => ({ ...prev, member_id: memberId }))}
                  onMemberSelect={setSelectedMember}
                  required
                  error={memberError}
                />

                {!editingPayment && (
                  <label className="gm-check-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <input type="checkbox" checked={printReceipt} onChange={(e) => setPrintReceipt(e.target.checked)} />
                    Print thermal receipt after payment
                  </label>
                )}

                <div className="form-grid" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Amount (PKR) *</label>
                    <input type="number" required min="0" step="0.01" value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Registration Fee (PKR)</label>
                    <input type="number" min="0" step="0.01" value={formData.registration_fee}
                      onChange={(e) => setFormData({ ...formData, registration_fee: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Discount (PKR)</label>
                    <input type="number" min="0" step="0.01" value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Subtotal (PKR)</label>
                    <input
                      type="text"
                      readOnly
                      value={(Number(formData.amount) + Number(formData.registration_fee)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      style={{
                        background: 'rgba(234,179,8,0.1)',
                        color: '#eab308',
                        fontWeight: 'bold',
                        border: '1px solid rgba(234,179,8,0.25)'
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Net Payable (PKR)</label>
                    <input
                      type="text"
                      readOnly
                      value={(Number(formData.amount) + Number(formData.registration_fee) - Number(formData.discount_amount)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      style={{
                        background: 'rgba(234,179,8,0.15)',
                        color: '#eab308',
                        fontWeight: 'bold',
                        border: '1px solid rgba(234,179,8,0.3)'
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">EasyPaisa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Type</label>
                    <select value={formData.payment_type} onChange={(e) => setFormData({ ...formData, payment_type: e.target.value, plan_id: '', amount: 0 })}>
                      <option value="membership">Membership</option>
                      <option value="registration">Registration</option>
                      <option value="personal_training">Personal Training</option>
                      <option value="supplement">Supplement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {formData.payment_type === 'membership' && (
                    <div className="form-group">
                      <label>Membership Plan</label>
                      <select
                        value={formData.plan_id}
                        onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                      >
                        <option value="">Select Plan</option>
                        {membershipPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} - PKR {plan.price.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input type="date" required value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
                  </div>
                  {editingPayment && (
                    <div className="form-group">
                      <label>Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea value={formData.notes} rows={2}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowModal(false); setEditingPayment(null); resetForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : `${editingPayment ? 'Update' : 'Create'} Payment`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
