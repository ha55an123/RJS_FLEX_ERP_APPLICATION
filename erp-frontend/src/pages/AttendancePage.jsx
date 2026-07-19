import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { getEmployees } from '../api/employees';
import { upsertAttendance } from '../api/attendancePayroll';


export default function AttendancePage() {
  const { user } = useAuth();
  const isAllowed = ['admin', 'company_manager'].includes(user?.role);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [workDate, setWorkDate] = useState(todayStr);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('present');
  const [overtimeHours, setOvertimeHours] = useState('0');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getEmployees();
        setEmployees(data);
      } catch {
        setToast({ message: 'Failed to load employees', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAllowed) return;
    if (!employeeId) return;

    try {
      await upsertAttendance({
        employee_id: Number(employeeId),
        work_date: workDate,
        status,
        overtime_hours: Number(overtimeHours || 0),
      });
      setToast({ message: 'Attendance saved', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || 'Failed to save attendance', type: 'error' });
    }
  };

  if (!isAllowed) {
    return (
      <div className="page">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="empty-state">
          <p>Access denied.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1>Employee Attendance</h1>
          <p>Record present/absent and overtime hours</p>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading employees…</div>
      ) : (
        <div className="table-card">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>
                  Work Date
                </label>
                <input style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>
                  Employee
                </label>
                <select style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>
                  Status
                </label>
                <select style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="present">present</option>
                  <option value="absent">absent</option>
                  <option value="half_day">half_day</option>
                  <option value="leave">leave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '0.25rem' }}>
                  Overtime Hours
                </label>
                <input style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7 }} type="number" min="0" step="0.5" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} />
                <p style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Policy counts overtime in 1.5h blocks</p>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
              <button className="btn-primary" type="submit">Save Attendance</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

