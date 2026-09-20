import { useState } from 'react';
import { reportsAPI } from '../api/gym/reports';
import { FileText, Download, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);

  const reports = [
    { id: 'attendance', name: 'Attendance Report', icon: Users, description: 'Daily attendance summary' },
    { id: 'revenue', name: 'Revenue Report', icon: DollarSign, description: 'Income and payments summary' },
    { id: 'membership', name: 'Membership Report', icon: FileText, description: 'Active and expired memberships' },
    { id: 'workout', name: 'Workout Report', icon: TrendingUp, description: 'Member workout progress' },
    { id: 'payment', name: 'Payment Report', icon: DollarSign, description: 'Payment history and status' },
    { id: 'inventory', name: 'Inventory Report', icon: FileText, description: 'Stock levels and usage' },
  ];

  const handleGenerate = async () => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }
    setLoading(true);
    try {
      const response = await reportsAPI.generate(selectedReport, {
        start_date: startDate,
        end_date: endDate,
        branch_id: branchId,
      });
      alert('Report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }
    setLoading(true);
    try {
      await reportsAPI.export(selectedReport, format, {
        start_date: startDate,
        end_date: endDate,
        branch_id: branchId,
      });
      alert(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
              selectedReport === report.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-3 rounded-full ${
                selectedReport === report.id ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <report.icon className={`w-6 h-6 ${
                  selectedReport === report.id ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <h3 className="text-lg font-bold">{report.name}</h3>
            </div>
            <p className="text-gray-500 text-sm">{report.description}</p>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Generate {reports.find(r => r.id === selectedReport)?.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch (Optional)</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">All Branches</option>
                <option value="1">Main Branch</option>
                <option value="2">Branch 2</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText size={20} />
              Generate Report
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Download size={20} />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download size={20} />
              Export Excel
            </button>
          </div>
        </div>
      )}

      {!selectedReport && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Select a report type to generate</p>
        </div>
      )}
    </div>
  );
}
