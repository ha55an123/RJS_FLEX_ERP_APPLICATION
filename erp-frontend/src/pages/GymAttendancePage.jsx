import { useState, useEffect } from 'react';
import { attendanceAPI } from '../api/gym/attendance';
import { membersAPI } from '../api/gym/members';
import { Search, LogIn, LogOut, Calendar, Clock, User } from 'lucide-react';

export default function GymAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInModal, setCheckInModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [todayStats, setTodayStats] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [attRes, membersRes] = await Promise.all([
        attendanceAPI.getToday(),
        membersAPI.getAll(),
      ]);
      setAttendance(attRes.data || []);
      setMembers(membersRes.data?.items || membersRes.data || []);
      setTodayStats({
        total_checkins: (attRes.data || []).length,
        currently_in: (attRes.data || []).filter(a => a.status === 'checked_in').length,
        avg_duration: '-',
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    const member = members.find(m => m.id === selectedMember);
    if (!member) return;
    try {
      await attendanceAPI.checkIn({
        identifier: member.member_code,
        method: 'manual',
        branch_id: member.branch_id,
      });
      setCheckInModal(false);
      setSelectedMember(null);
      loadData();
    } catch (error) {
      console.error('Failed to check in:', error);
      alert('Check-in failed. Member may already be checked in.');
    }
  };

  const handleCheckOut = async (record) => {
    const member = members.find((item) => item.id === record.member_id);
    if (!member) {
      alert('Unable to check out: the member record is unavailable.');
      return;
    }
    try {
      await attendanceAPI.checkOut(member.member_code, record.branch_id);
      loadData();
    } catch (error) {
      console.error('Failed to check out:', error);
    }
  };

  const filteredAttendance = attendance.filter(a =>
    `${a.member_name || ''} ${a.member_code || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = members.filter(m =>
    `${m.first_name} ${m.last_name} ${m.member_code || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading attendance...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gym Attendance</h1>
        <button
          onClick={() => setCheckInModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <LogIn size={20} />
          Quick Check-In
        </button>
      </div>

      {todayStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Check-ins</p>
                <p className="text-2xl font-bold">{todayStats.total_checkins || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <LogIn className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Currently In</p>
                <p className="text-2xl font-bold">{todayStats.currently_in || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Avg Duration</p>
                <p className="text-2xl font-bold">{todayStats.avg_duration || '0h'}m</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Date</p>
                <p className="text-lg font-bold">{selectedDate}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by member name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded-lg px-4 py-2"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAttendance.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium">{record.member_name || '-'}</div>
                    <div className="text-sm text-gray-500">{record.member_code || ''}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{record.check_in_time || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.check_out_time || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{record.total_hours ? `${record.total_hours}h` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{record.method || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                    record.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(record)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <LogOut size={18} />
                      Check Out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAttendance.length === 0 && (
          <div className="text-center py-8 text-gray-500">No attendance records found for this date</div>
        )}
      </div>

      {checkInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Quick Check-In</h2>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Member *</label>
                  <select
                    required
                    value={selectedMember || ''}
                    onChange={(e) => setSelectedMember(parseInt(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select Member</option>
                    {filteredMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.member_code} - {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInModal(false);
                      setSelectedMember(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Check In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
