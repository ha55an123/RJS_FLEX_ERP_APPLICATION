import { useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getEmployees } from '../api/employees';
import { getLedgers } from '../api/ledgers';
import { runProductionPayroll, listProductionPayrollRuns, getProductionPayrollRun } from '../api/productionPayroll';

export default function ProductionPayrollPage() {
  const { user } = useAuth();
  const isAllowed = ['admin', 'company_manager'].includes(user?.role);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [bonus, setBonus] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [ledgerId, setLedgerId] = useState('');
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [ledgers, setLedgers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: employees }, { data: ledgerData }] = await Promise.all([
          getEmployees(),
          getLedgers({ status: 'Active' }),
        ]);
        setLedgerId((ledgerData[0]?.id || '').toString());
      } catch {
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const { data } = await listProductionPayrollRuns();
        setRuns(data);
      } catch {
      }
    };
    loadRuns();
  }, []);

  const handleRun = async () => {
    if (!isAllowed) return;
    setLoading(true);
    try {
      const payload = {
        period_year: Number(year),
        period_month: Number(month),
        bonus: Number(bonus),
        deductions: Number(deductions),
      };
      const { data } = await runProductionPayroll(payload);
      setRun(data);
      setToast({ message: 'Production payroll finalized', type: 'success' });
      const { data: runList } = await listProductionPayrollRuns();
      setRuns(runList);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Production payroll failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = async (id) => {
    try {
      const { data } = await getProductionPayrollRun(id);
      setRun(data);
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Could not load run', type: 'error' });
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
          <h1>Production Payroll</h1>
          <p>Run production payroll with loan and advance deductions.</p>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} />
          </div>
          <div>
            <label>Month</label>
            <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} />
          </div>
          <div>
            <label>Bonus</label>
            <input type="number" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} />
          </div>
          <div>
            <label>Additional Deductions</label>
            <input type="number" step="0.01" value={deductions} onChange={(e) => setDeductions(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" disabled={loading} onClick={handleRun}>
            {loading ? 'Running…' : 'Run Production Payroll'}
          </button>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <h3>Payroll History</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {runs.map((runItem) => (
            <button
              key={runItem.id}
              className={`btn-ghost ${run?.id === runItem.id ? 'active' : ''}`}
              onClick={() => handleSelectRun(runItem.id)}
            >
              {runItem.period_year}-{String(runItem.period_month).padStart(2, '0')} • {runItem.status}
            </button>
          ))}
          {!runs.length && <p style={{ margin: 0, color: 'var(--text-muted)' }}>No runs yet.</p>}
        </div>
      </div>

      {run?.items?.length ? (
        <div className="table-card">
          <h3>Run #{run.id}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Total Qty</th>
                <th>Total Amount</th>
                <th>Loan Deduction</th>
                <th>Advance Deduction</th>
                <th>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((item) => (
                <tr key={item.employee_id}>
                  <td>#{item.employee_id}</td>
                  <td>{item.total_quantity}</td>
                  <td>PKR {Number(item.total_amount).toLocaleString()}</td>
                  <td>PKR {Number(item.loan_deduction).toLocaleString()}</td>
                  <td>PKR {Number(item.advance_deduction).toLocaleString()}</td>
                  <td><strong>PKR {Number(item.net_pay).toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><p>Select a run or create one to view payroll calculations.</p></div>
      )}
    </div>
  );
}
