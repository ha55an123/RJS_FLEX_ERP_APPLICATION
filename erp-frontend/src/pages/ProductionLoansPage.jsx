import { useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getEmployees } from '../api/employees';
import { getLedgers } from '../api/ledgers';
import { getProductionLoans, createProductionLoan } from '../api/productionPayroll';

const EMPTY_FORM = {
  employee_id: '',
  ledger_id: '',
  amount: '',
  monthly_deduction: '',
  issue_date: '',
  due_date: '',
  notes: '',
};

export default function ProductionLoansPage() {
  const { user } = useAuth();
  const isAllowed = ['admin', 'company_manager'].includes(user?.role);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: employeeData }, { data: ledgerData }, { data: loanData }] = await Promise.all([
          getEmployees(),
          getLedgers({ status: 'Active' }),
          getProductionLoans(),
        ]);
        setEmployees(employeeData);
        setLedgers(ledgerData);
        setLoans(loanData);
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
      await createProductionLoan({
        employee_id: Number(form.employee_id),
        ledger_id: Number(form.ledger_id),
        amount: Number(form.amount),
        monthly_deduction: Number(form.monthly_deduction),
        issue_date: form.issue_date || undefined,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
      });
      setToast({ message: 'Loan recorded', type: 'success' });
      setForm(EMPTY_FORM);
      const { data } = await getProductionLoans();
      setLoans(data);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to save loan', type: 'error' });
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
          <h1>Production Loans</h1>
          <p>Issue and view employee production loans.</p>
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

            <label>
              Due Date
              <input type="date" value={form.due_date} onChange={setField('due_date')} />
            </label>
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={setField('notes')} rows={3} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Loan'}</button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <h3>Loans</h3>
        {loading ? (
          <div className="page-loading">Loading loans…</div>
        ) : loans.length === 0 ? (
          <div className="empty-state"><p>No loans recorded yet.</p></div>
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
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.id}</td>
                  <td>#{loan.employee_id}</td>
                  <td>PKR {Number(loan.amount).toLocaleString()}</td>
                  <td>PKR {Number(loan.balance).toLocaleString()}</td>
                  <td>PKR {Number(loan.monthly_deduction).toLocaleString()}</td>
                  <td>{loan.status}</td>
                  <td>{loan.issue_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
