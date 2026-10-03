import React, { useState, useEffect, useRef } from 'react';
import { branchesAPI } from '../api/gym/branches';
import fingerprintAttendanceAPI from '../api/gym/fingerprintAttendance';
import { useAuth } from '../context/AuthContext';
import { Fingerprint } from 'lucide-react';
import Toast from '../components/Toast';

export default function FingerprintAttendancePage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('initial'); // initial, connected, waiting, detected, verified, not_recognized, disconnected
  const [message, setMessage] = useState('Initializing biometric device...');
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [toast, setToast] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadBranches();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadDevices();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const res = await branchesAPI.getAll();
      const branchesList = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setBranches(branchesList);
      if (branchesList.length > 0) {
        const userBranch = branchesList.find(b => b.id === user?.branch_id);
        setSelectedBranch(userBranch?.id || branchesList[0].id);
      }
    } catch (error) {
      setToast({ message: 'Failed to load branches', type: 'error' });
    }
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fingerprintAttendanceAPI.listDevices(selectedBranch);
      const data = Array.isArray(res.data) ? res.data : [];
      setDevices(data);
      if (data && data.length > 0) {
        setSelectedDevice(data[0]);
        setStatus('connected');
        setMessage('Scanner Connected');
      } else {
        setStatus('disconnected');
        setMessage('No fingerprint devices configured for this branch');
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      if (error.response?.status === 401) {
        setStatus('disconnected');
        setMessage('Authentication required. Please login again.');
        setToast({ message: 'Session expired. Please login again.', type: 'error' });
      } else if (error.response?.status === 403) {
        setStatus('disconnected');
        setMessage('You do not have permission to access fingerprint devices.');
        setToast({ message: 'Access denied. Contact administrator.', type: 'error' });
      } else {
        setStatus('disconnected');
        setMessage('Unable to connect to biometric device');
        setToast({ message: 'Failed to load devices. Please try again.', type: 'error' });
      }
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const startPolling = () => {
    if (!selectedDevice) {
      setToast({ message: 'Please select a fingerprint device first', type: 'error' });
      return;
    }
    
    setIsPolling(true);
    setStatus('waiting');
    setMessage('Place your finger/thumb on the fingerprint scanner...');
    setAttendanceResult(null);

    // Poll for device status and recent attendance
    pollIntervalRef.current = setInterval(async () => {
      try {
        // Check device status using authenticated API
        const res = await fingerprintAttendanceAPI.getDeviceStatus(selectedDevice.id);
        const statusData = res.data;

        if (statusData.connection_status !== 'online') {
          setStatus('disconnected');
          setMessage('Biometric device is offline. Check the device/network connection.');
          setIsPolling(false);
          clearInterval(pollIntervalRef.current);
          return;
        }

        // The actual fingerprint verification happens on the device
        // The device calls the backend API when a fingerprint is verified
        // This polling is just to check device status
        
      } catch (error) {
        console.error('Polling error:', error);
        if (error.response?.status === 401) {
          setStatus('disconnected');
          setMessage('Authentication required. Please login again.');
          setToast({ message: 'Session expired. Please login again.', type: 'error' });
        } else {
          setStatus('disconnected');
          setMessage('Unable to connect to biometric device');
        }
        setIsPolling(false);
        clearInterval(pollIntervalRef.current);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    if (selectedDevice) {
      setStatus('connected');
      setMessage('Scanner Connected');
    } else {
      setStatus('disconnected');
      setMessage('No fingerprint device selected');
    }
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(Number(e.target.value));
    setSelectedDevice(null);
    stopPolling();
  };

  const handleDeviceChange = (e) => {
    const device = devices.find(d => d.id === Number(e.target.value));
    setSelectedDevice(device);
    stopPolling();
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Fingerprint Attendance</h1>
        <p>Scan fingerprint to record attendance</p>
      </div>

      {/* Branch and Device Selection */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(30,30,40,0.9)',
                border: '1px solid rgba(234,179,8,0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
              Fingerprint Device
            </label>
            <select
              value={selectedDevice?.id || ''}
              onChange={handleDeviceChange}
              disabled={!selectedBranch || devices.length === 0}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(30,30,40,0.9)',
                border: '1px solid rgba(234,179,8,0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem',
                opacity: (!selectedBranch || devices.length === 0) ? 0.5 : 1
              }}
            >
              <option value="">Select Device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.device_name} ({device.brand})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fingerprint Scanner Interface */}
      <div className="table-card" style={{ textAlign: 'center', padding: '3rem 2rem', minHeight: '400px' }}>
        {/* Fingerprint Icon */}
        <div style={{
          width: '140px',
          height: '140px',
          margin: '0 auto 2rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: status === 'verified'
            ? 'rgba(34,197,94,0.2)'
            : status === 'not_recognized'
            ? 'rgba(239,68,68,0.2)'
            : status === 'disconnected'
            ? 'rgba(239,68,68,0.15)'
            : status === 'waiting'
            ? 'rgba(234,179,8,0.2)'
            : 'rgba(234,179,8,0.15)',
          border: status === 'verified'
            ? '4px solid rgba(34,197,94,0.5)'
            : status === 'not_recognized'
            ? '4px solid rgba(239,68,68,0.5)'
            : status === 'disconnected'
            ? '4px solid rgba(239,68,68,0.3)'
            : status === 'waiting'
            ? '4px solid rgba(234,179,8,0.5)'
            : '4px solid rgba(234,179,8,0.3)',
          transition: 'all 0.3s ease'
        }}>
          <Fingerprint 
            size={64} 
            color={status === 'verified'
              ? '#22c55e'
              : status === 'not_recognized'
              ? '#ef4444'
              : status === 'disconnected'
              ? '#ef4444'
              : status === 'waiting'
              ? '#eab308'
              : '#eab308'
            }
            strokeWidth={2}
          />
        </div>

        {/* Status Message */}
        <h2 style={{
          color: status === 'verified'
            ? '#22c55e'
            : status === 'not_recognized'
            ? '#ef4444'
            : status === 'disconnected'
            ? '#ef4444'
            : status === 'waiting'
            ? '#eab308'
            : '#fff',
          marginBottom: '1rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {status === 'verified' ? 'Attendance Recorded' :
           status === 'not_recognized' ? 'Fingerprint Not Recognized' :
           status === 'disconnected' ? 'Biometric Device Offline' :
           status === 'waiting' ? 'Waiting for Fingerprint...' :
           status === 'connected' ? 'Scanner Connected' :
           'Initializing Biometric Device...'}
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '1.1rem',
          marginBottom: '2rem',
          maxWidth: '400px',
          margin: '0 auto 2rem',
          lineHeight: '1.6'
        }}>
          {message}
        </p>

        {/* Device Info */}
        {selectedDevice && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: status === 'connected' || status === 'waiting'
              ? 'rgba(34,197,94,0.1)'
              : 'rgba(239,68,68,0.1)',
            border: status === 'connected' || status === 'waiting'
              ? '1px solid rgba(34,197,94,0.3)'
              : '1px solid rgba(239,68,68,0.3)',
            borderRadius: '20px',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: status === 'connected' || status === 'waiting'
                ? '#22c55e'
                : '#ef4444',
              animation: (status === 'connected' || status === 'waiting') ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{
              color: status === 'connected' || status === 'waiting'
                ? '#22c55e'
                : '#ef4444',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              {status === 'connected' || status === 'waiting' ? 'Device Connected' : 'Device Offline'}
              {selectedDevice && ` - ${selectedDevice.device_name}`}
            </span>
          </div>
        )}

        {/* Attendance Result */}
        {attendanceResult && (
          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'left',
            maxWidth: '500px',
            margin: '0 auto 2rem'
          }}>
            <h3 style={{ color: '#22c55e', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>✓ Attendance Details</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Member:</span>
                <span style={{ color: '#fff', fontWeight: '500' }}>{attendanceResult.member_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Member Code:</span>
                <span style={{ color: '#fff', fontWeight: '500' }}>{attendanceResult.member_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Time:</span>
                <span style={{ color: '#fff', fontWeight: '500' }}>
                  {attendanceResult.check_in_time || attendanceResult.check_out_time}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Type:</span>
                <span style={{ color: '#fff', fontWeight: '500' }}>
                  {attendanceResult.check_out_time ? 'Check-out' : 'Check-in'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isPolling ? (
            <button
              onClick={startPolling}
              disabled={!selectedDevice || status === 'disconnected'}
              style={{
                background: (!selectedDevice || status === 'disconnected')
                  ? 'rgba(234,179,8,0.3)'
                  : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                color: (!selectedDevice || status === 'disconnected') ? 'rgba(255,255,255,0.5)' : '#000',
                fontWeight: '600',
                cursor: (!selectedDevice || status === 'disconnected') ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedDevice && status !== 'disconnected') {
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Start Scanning
            </button>
          ) : (
            <button
              onClick={stopPolling}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Stop Scanning
            </button>
          )}
          <button
            onClick={() => {
              loadDevices();
              setAttendanceResult(null);
              setStatus('initial');
              setMessage('Initializing biometric device...');
            }}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '0.75rem 2rem',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            Refresh Device
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ color: '#eab308', marginBottom: '1rem' }}>Instructions</h3>
        <ul style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>Ensure the fingerprint scanner is connected and powered on</li>
          <li>Select the correct branch and device from the dropdowns</li>
          <li>Click "Start Scanning" to begin listening for fingerprint scans</li>
          <li>Place your finger/thumb firmly on the scanner</li>
          <li>Wait for the device to verify and record attendance</li>
          <li>If the fingerprint is not recognized, contact reception to register your fingerprint</li>
          <li>Duplicate attendance within 1 hour will be prevented</li>
        </ul>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
