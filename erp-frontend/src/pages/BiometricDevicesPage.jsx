import React, { useState, useEffect } from 'react';
import { biometricAPI } from '../api/gym/biometric';
import { branchesAPI } from '../api/gym/branches';
import { Plus, Search, Edit, Trash2, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BiometricDevicesPage error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-red-100 border border-red-300 text-red-800 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="mb-4">An error occurred while displaying biometric devices.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BiometricDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'fingerprint',
    brand: '',
    model: '',
    serial_number: '',
    ip_address: '',
    port: '',
    branch_id: '',
    location: '',
    protocol: 'tcp_ip',
  });

  useEffect(() => {
    loadData();
  }, []);

  // lock scrolling when modal open
  useEffect(() => {
    if (showModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, branchesRes] = await Promise.all([
        biometricAPI.getAll(),
        branchesAPI.getAll(),
      ]);
      const devicesList = Array.isArray(devicesRes.data) ? devicesRes.data : (devicesRes.data?.items || []);
      const branchesList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.items || []);
      setDevices(devicesList || []);
      setBranches(branchesList || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to load biometric devices' });
      setDevices([]); // Ensure devices is always an array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    
    try {
      if (editingDevice) {
        await biometricAPI.update(editingDevice.id, {
          ip_address: formData.ip_address,
          port: Number(formData.port),
          protocol: formData.protocol === 'tcp' ? 'tcp_ip' : formData.protocol,
        });
        setStatus({ type: 'success', message: 'Device updated successfully' });
      } else {
        await biometricAPI.create({
          branch_id: Number(formData.branch_id),
          device_name: formData.name,
          device_uid: formData.serial_number,
          brand: formData.brand || 'Other',
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          ip_address: formData.ip_address || null,
          port: Number(formData.port) || 4370,
          protocol: formData.protocol,
          sync_interval: '5min',
          notes: formData.location || null,
          is_active: true,
        });
        setStatus({ type: 'success', message: 'Device created successfully' });
        // Only close modal and reset form on success
        setShowModal(false);
        setEditingDevice(null);
        setFormData({
          name: '',
          device_type: 'fingerprint',
          brand: '',
          model: '',
          serial_number: '',
          ip_address: '',
          port: '',
          branch_id: '',
          location: '',
          protocol: 'tcp_ip',
        });
        await loadData();
      }
    } catch (error) {
      console.error('Failed to save device:', error);
      let errorMessage = 'Failed to save device';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus({ type: 'error', message: errorMessage });
      // Keep modal open on error so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.device_name || '',
      device_type: device.device_type || 'fingerprint',
      brand: device.brand || '',
      model: device.model || '',
      serial_number: device.serial_number || '',
      ip_address: device.ip_address || '',
      port: device.port || 0,
      branch_id: device.branch_id || '',
      location: device.location || '',
      protocol: device.protocol || 'tcp_ip',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await biometricAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete device:', error);
      }
    }
  };

  const handleSync = async (id) => {
    try {
      await biometricAPI.sync(id);
      setStatus({ type: 'success', message: 'Sync initiated successfully' });
      loadData();
    } catch (error) {
      console.error('Failed to sync device:', error);
      setStatus({ type: 'error', message: 'Sync failed' });
    }
  };

  const handleTest = async (id) => {
    try {
      await biometricAPI.test(id);
      setStatus({ type: 'success', message: 'Device record is reachable. Use Sync to contact the device.' });
    } catch (error) {
      console.error('Failed to test device:', error);
      setStatus({ type: 'error', message: 'Connection test failed' });
    }
  };

  const filteredDevices = (devices || []).filter(d =>
    `${d.device_name || ''} ${d.brand || ''} ${d.model || ''} ${d.serial_number || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading devices...</div>;

  return (
    <div className="p-6">
      {status.type === 'error' && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300 flex items-center justify-between">
          <span>{status.message}</span>
          <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Biometric Devices</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Device
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search devices by name, brand, model, or serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {status.type === 'success' && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-300">
          {status.message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand/Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sync Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDevices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{device.device_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{device.device_type || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{device.brand || ''} {device.model || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap">{device.ip_address || '-'}:{device.port || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{device.branch_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {device.connection_status === 'online' ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      device.connection_status === 'online' ? 'bg-green-100 text-green-800' :
                      device.connection_status === 'syncing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {device.connection_status || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button onClick={() => handleSync(device.id)} className="text-blue-600 hover:text-blue-800" title="Sync">
                      <RefreshCw size={18} />
                    </button>
                    <button onClick={() => handleTest(device.id)} className="text-green-600 hover:text-green-800" title="Test Connection">
                      <Wifi size={18} />
                    </button>
                    <button onClick={() => handleEdit(device)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(device.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDevices.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>No biometric devices registered yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Biometric Device
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={editingDevice ? 'Edit Device' : 'Add Device'}>
          <div className="modal-card w-full max-w-lg max-h-[90vh]">
            <div className="modal-header sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingDevice ? 'Edit Device' : 'Add New Device'}</h3>
              <button aria-label="Close" onClick={() => { setShowModal(false); setEditingDevice(null); }} className="text-gray-600 hover:text-gray-900">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form flex flex-col h-full">
              <div className="modal-body overflow-y-auto p-6 space-y-4">
                {status.type === 'error' && (
                  <div className="p-3 bg-red-100 text-red-800 rounded-lg border border-red-300 text-sm">
                    {status.message}
                  </div>
                )}
                {status.type === 'success' && (
                  <div className="p-3 bg-green-100 text-green-800 rounded-lg border border-green-300 text-sm">
                    {status.message}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Device Type *</label>
                  <select
                    required
                    value={formData.device_type}
                    onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="fingerprint">Fingerprint Scanner</option>
                    <option value="face_recognition">Face Recognition</option>
                    <option value="rfid">RFID Reader</option>
                    <option value="iris">Iris Scanner</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <select
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Brand</option>
                      <option value="ZKTeco">ZKTeco</option>
                      <option value="eSSL">eSSL</option>
                      <option value="Suprema">Suprema</option>
                      <option value="Hikvision">Hikvision</option>
                      <option value="Anviz">Anviz</option>
                      <option value="FingerTec">FingerTec</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={formData.serial_number}
                    onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">IP Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.ip_address}
                      onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Port *</label>
                    <input
                      type="text"
                      required
                      value={formData.port}
                      onChange={(e) => setFormData({...formData, port: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="4370"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Branch *</label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Protocol</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({...formData, protocol: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="tcp_ip">TCP/IP</option>
                    <option value="sdk">SDK</option>
                    <option value="rest_api">REST API</option>
                    <option value="webhook">Webhook</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer sticky bottom-0 bg-white p-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDevice(null);
                    setStatus({ type: '', message: '' });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {submitting ? (editingDevice ? 'Updating...' : 'Creating...') : (editingDevice ? 'Update' : 'Create') + ' Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap the component with ErrorBoundary
const BiometricDevicesPageWithErrorBoundary = () => (
  <ErrorBoundary>
    <BiometricDevicesPage />
  </ErrorBoundary>
);

export default BiometricDevicesPageWithErrorBoundary;
