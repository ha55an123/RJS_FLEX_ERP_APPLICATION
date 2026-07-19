import { useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { runPayroll, getPayrollRun } from '../api/attendancePayroll';
import { getEmployees } from '../api/employees';

export default function PayrollPage() {
  const { user } = useAuth();
  const isAllowed = ['admin', 'company_manager'].includes(user?.role);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [monthPlan, setMonthPlan] = useState('30'); // "24"|"30"

  const [overtimeRateType, setOvertimeRateType] = useState('single'); // single|double
  const [overtimeBlockHours, setOvertimeBlockHours] = useState(1.5);

  const [runId, setRunId] = useState(null);
  const [run, setRun] = useState(null);

  const [employeesCount, setEmployeesCount] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getEmployees();
        setEmployeesCount(data.length);
      } catch {}
      setLoadingEmployees(false);
    };
    load();
  }, []);

  const handleRun = async () => {
    if (!isAllowed) return;
    setLoading(true);
    try {
      const payload = {
        period_year: Number(year),
        period_month: Number(month),
        month_plan: monthPlan,
        overtime_rate_type: overtimeRateType,
        overtime_block_hours: Number(overtimeBlockHours),
      };

      const res = await runPayroll(payload);
      setRun(res.data);
      setRunId(res.data.id);
      setToast({ message: 'Payroll finalized', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Payroll failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If you navigate back and runId exists, optionally fetch run again.
    // Kept minimal.
  }, [runId]);

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
          <h1>Payroll</h1>
          <p>Compute salary deductions (absent) and overtime</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" disabled={loadingEmployees} onClick={async () => {}}>
            Employees: {loadingEmployees ? '…' : employeesCount ?? 0}
          </button>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>Period Year</label>
            <input style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>Period Month</label>
            <input style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} type="number" value={month} min="1" max="12" onChange={(e) => setMonth(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>Month Plan</label>
            <select style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} value={monthPlan} onChange={(e) => setMonthPlan(e.target.value)}>
              <option value="24">24-days</option>
              <option value="30">30-days</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>Overtime multiplier</label>
            <select style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} value={overtimeRateType} onChange={(e) => setOvertimeRateType(e.target.value)}>
              <option value="single">single (x1)</option>
              <option value="double">double (x2)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>Overtime block hours</label>
            <input style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} type="number" step="0.5" value={overtimeBlockHours} onChange={(e) => setOvertimeBlockHours(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" disabled={loading} onClick={handleRun}>
            {loading ? 'Running…' : 'Run & Finalize Payroll'}
          </button>
        </div>
      </div>

      {run?.items?.length ? (
        <div className="table-card">
          <h3 style={{ margin: '0 0 0.75rem 0' }}>Payroll Results</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: -8, marginBottom: '1rem' }}>
            Run ID #{run.id} • {run.period_year}-{String(run.period_month).padStart(2, '0')} • Plan {run.month_plan}-days • Overtime {run.overtime_rate_type}
          </p>

          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Base Salary</th>
                <th>Absent Days</th>
                <th>Absent Deduction</th>
                <th>Overtime Blocks</th>
                <th>Overtime Pay</th>
                <th>Final Salary</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((it) => (
                <tr key={it.employee_id}>
                  <td>#{it.employee_id}</td>
                  <td><strong>PKR {Number(it.base_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>{it.absent_days}</td>
                  <td>PKR {Number(it.absent_deduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{Number(it.overtime_blocks).toFixed(2)}</td>
                  <td>PKR {Number(it.overtime_pay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td><strong>PKR {Number(it.final_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><p>No payroll run yet. Use the form above.</p></div>
      )}
    </div>
  );
}

