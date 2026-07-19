import { useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getEmployees } from '../api/employees';
import { getLedgers } from '../api/ledgers';
import { getProductionAdvances, createProductionAdvance } from '../api/productionPayroll';

const EMPTY_FORM = {
  employee_id: '',
  ledger_id: '',
  amount: '',
  monthly_deduction: '',
  issue_date: '',
  notes: '',
};

export default function ProductionAdvancesPage() {
  const { user } = useAuth();
  const isAllowed = ['admin', 'company_manager'].includes(user?.role);

  const [form, setForm] = useState(EMPTY_FORM);
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: employeeData }, { data: ledgerData }, { data: advanceData }] = await Promise.all([
          getEmployees(),
          getLedgers({ status: 'Active' }),
          getProductionAdvances(),
        ]);
        setEmployees(employeeData);
        setLedgers(ledgerData);
        setAdvances(advanceData);
        setForm((prev) => ({ ...prev, ledger_id: ledgerData[0]?.id?.toString() || '' }));
      } catch {
      }
      setLoading(false);
    };
    load();
  }, []);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProductionAdvance({
        employee_id: Number(form.employee_id),
        ledger_id: Number(form.ledger_id),
        amount: Number(form.amount),
        monthly_deduction: Number(form.monthly_deduction),
        issue_date: form.issue_date || undefined,
        notes: form.notes || undefined,
      });
      setToast({ message: 'Advance recorded', type: 'success' });
      setForm(EMPTY_FORM);
      const { data } = await getProductionAdvances();
      setAdvances(data);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to save advance', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="page">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="empty-state"><p>Access denied.</p></div>
      </div>
    );
  }

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>Production Advances</h1>
          <p>Issue and view employee production advances.</p>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label>
              Employee
              <select required value={form.employee_id} onChange={setField('employee_id')}>
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name || `#${emp.id}`}</option>
                ))}
              </select>
            </label>

            <label>
              Ledger
              <select required value={form.ledger_id} onChange={setField('ledger_id')}>
                <option value="">Select ledger</option>
                {ledgers.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>{ledger.ledger_name}</option>
                ))}
              </select>
            </label>

            <label>
              Amount
              <input type="number" min="0" step="0.01" required value={form.amount} onChange={setField('amount')} />
            </label>

            <label>
              Monthly Deduction
              <input type="number" min="0" step="0.01" required value={form.monthly_deduction} onChange={setField('monthly_deduction')} />
            </label>

            <label>
              Issue Date
              <input type="date" value={form.issue_date} onChange={setField('issue_date')} />
            </label>
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={setField('notes')} rows={3} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Advance'}</button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <h3>Advances</h3>
        {loading ? (
          <div className="page-loading">Loading advances…</div>
        ) : advances.length === 0 ? (
          <div className="empty-state"><p>No advances recorded yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Monthly</th>
                <th>Status</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((advance) => (
                <tr key={advance.id}>
                  <td>{advance.id}</td>
                  <td>#{advance.employee_id}</td>
                  <td>PKR {Number(advance.amount).toLocaleString()}</td>
                  <td>PKR {Number(advance.balance).toLocaleString()}</td>
                  <td>PKR {Number(advance.monthly_deduction).toLocaleString()}</td>
                  <td>{advance.status}</td>
                  <td>{advance.issue_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
