import { useState, useEffect } from 'react';
import { biometricRegistrationsAPI } from '../api/gym/biometricRegistrations';
import { Fingerprint, User, Check, X, Loader2 } from 'lucide-react';

const FINGER_OPTIONS = [
  { value: 'right_thumb', label: 'Right Thumb' },
  { value: 'left_thumb', label: 'Left Thumb' },
  { value: 'right_index', label: 'Right Index' },
  { value: 'left_index', label: 'Left Index' },
  { value: 'right_middle', label: 'Right Middle' },
  { value: 'left_middle', label: 'Left Middle' },
  { value: 'right_ring', label: 'Right Ring' },
  { value: 'left_ring', label: 'Left Ring' },
  { value: 'right_little', label: 'Right Little' },
  { value: 'left_little', label: 'Left Little' },
];

export default function BiometricRegistrationModal({ member, onClose, onSuccess }) {
  const [step, setStep] = useState('method'); // method, device, finger, enrolling, success
  const [selectedMethod, setSelectedMethod] = useState(null); // 'fingerprint' or 'face'
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState(null);
  const [selectedFinger, setSelectedFinger] = useState('');
  const [zktecoUserId, setZktecoUserId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState('');
  const [error, setError] = useState('');
  const [existingRegistrations, setExistingRegistrations] = useState([]);

  useEffect(() => {
    if (member) {
      loadExistingRegistrations();
    }
  }, [member]);

  const loadExistingRegistrations = async () => {
    try {
      const res = await biometricRegistrationsAPI.getMemberStatus(member.id);
      setExistingRegistrations(res.data.registrations || []);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await biometricRegistrationsAPI.listDevices(member.branch_id);
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Filter devices based on selected method
      const filteredDevices = data.filter(device => {
        if (selectedMethod === 'fingerprint') {
          return device.supports_fingerprint;
        } else if (selectedMethod === 'face') {
          return device.supports_face;
        }
        return true;
      });
      
      setDevices(filteredDevices);
      
      if (filteredDevices.length === 0) {
        setError(
          selectedMethod === 'face'
            ? 'No face-capable devices found for this branch. Please add a face recognition device first.'
            : 'No fingerprint-capable devices found for this branch.'
        );
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to load devices. Please try again.');
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setStep('device');
    loadDevices();
  };

  const handleDeviceSelect = async (device) => {
    setSelectedDevice(device);
    
    // Get device capabilities
    try {
      const res = await biometricRegistrationsAPI.getDeviceCapabilities(device.id);
      setDeviceCapabilities(res.data);
      
      // Check if device supports selected method
      if (selectedMethod === 'face' && !res.data.supports_face) {
        setError('The selected device does not support face recognition. Please select a face-capable device.');
        return;
      }
      
      if (selectedMethod === 'fingerprint' && !res.data.supports_fingerprint) {
        setError('The selected device does not support fingerprint enrollment.');
        return;
      }
      
      setError('');
      
      if (selectedMethod === 'fingerprint') {
        setStep('finger');
      } else {
        setStep('enroll');
      }
    } catch (err) {
      console.error('Failed to get device capabilities:', err);
      setError('Failed to get device capabilities. Please try again.');
    }
  };

  const handleFingerSelect = (finger) => {
    setSelectedFinger(finger);
    setStep('enroll');
  };

  const handleEnroll = async () => {
    if (!selectedDevice || !zktecoUserId) {
      setError('Please select a device and enter a ZKTeco User ID');
      return;
    }

    if (selectedMethod === 'fingerprint' && !selectedFinger) {
      setError('Please select a finger');
      return;
    }

    setEnrolling(true);
    setError('');
    setEnrollProgress('Connecting to device...');

    try {
      const payload = {
        member_id: member.id,
        device_id: selectedDevice.id,
        biometric_type: selectedMethod,
        finger_type: selectedMethod === 'fingerprint' ? selectedFinger : null,
        zkteco_user_id: zktecoUserId,
      };

      setEnrollProgress('Enrolling biometric on device...');
      
      const res = await biometricRegistrationsAPI.enroll(payload);

      if (res.data.success) {
        setEnrollProgress('Enrollment successful!');
        setStep('success');
        loadExistingRegistrations();
        if (onSuccess) onSuccess();
      } else {
        setError(res.data.message || 'Enrollment failed');
        setEnrollProgress('');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError(err.response?.data?.detail || 'Enrollment failed. Please try again.');
      setEnrollProgress('');
    } finally {
      setEnrolling(false);
    }
  };

  const resetAndClose = () => {
    setStep('method');
    setSelectedMethod(null);
    setSelectedDevice(null);
    setSelectedFinger('');
    setZktecoUserId('');
    setError('');
    setEnrollProgress('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Biometric Registration</h2>
          <button onClick={resetAndClose} className="icon-btn" style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Member Info */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(234,179,8,0.1)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontWeight: '500', color: '#eab308' }}>Member: {member.first_name} {member.last_name}</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Code: {member.member_code}</p>
          </div>

          {/* Existing Registrations */}
          {existingRegistrations.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: '500', color: '#22c55e', marginBottom: '0.5rem' }}>Existing Registrations:</p>
              {existingRegistrations.map((reg) => (
                <div key={reg.id} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                  {reg.biometric_type === 'fingerprint' ? (
                    <span>• Fingerprint ({reg.finger_type?.replace('_', ' ')})</span>
                  ) : (
                    <span>• Face Recognition</span>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem' }}>
                    - {reg.device_name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step: Method Selection */}
          {step === 'method' && (
            <div>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Choose Biometric Method</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => handleMethodSelect('fingerprint')}
                  style={{
                    padding: '2rem',
                    background: 'rgba(234,179,8,0.1)',
                    border: '2px solid rgba(234,179,8,0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.borderColor = 'rgba(234,179,8,0.6)'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'rgba(234,179,8,0.3)'}
                >
                  <Fingerprint size={48} style={{ color: '#eab308' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>FINGERPRINT</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Thumb / Finger</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMethodSelect('face')}
                  style={{
                    padding: '2rem',
                    background: 'rgba(59,130,246,0.1)',
                    border: '2px solid rgba(59,130,246,0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.3)'}
                >
                  <User size={48} style={{ color: '#3b82f6' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>FACE</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Face Recognition</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Device Selection */}
          {step === 'device' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => setStep('method')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.5rem' }}>←</button>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Select Device</h3>
              </div>

              {error && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '1rem', color: '#ef4444', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              {devices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {devices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => handleDeviceSelect(device)}
                      disabled={enrolling}
                      style={{
                        padding: '1rem',
                        background: selectedDevice?.id === device.id ? 'rgba(234,179,8,0.2)' : 'rgba(30,30,40,0.9)',
                        border: selectedDevice?.id === device.id ? '2px solid #eab308' : '1px solid rgba(234,179,8,0.2)',
                        borderRadius: '8px',
                        cursor: enrolling ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{device.device_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        {device.brand} {device.model}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                        {device.supports_fingerprint && <span style={{ color: '#22c55e', marginRight: '0.5rem' }}>✓ Fingerprint</span>}
                        {device.supports_face && <span style={{ color: '#3b82f6' }}>✓ Face</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' }}>
                  {error || 'No devices available'}
                </div>
              )}
            </div>
          )}

          {/* Step: Finger Selection */}
          {step === 'finger' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => setStep('device')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.5rem' }}>←</button>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Select Finger</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {FINGER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFingerSelect(option.value)}
                    disabled={enrolling}
                    style={{
                      padding: '0.75rem',
                      background: selectedFinger === option.value ? 'rgba(234,179,8,0.2)' : 'rgba(30,30,40,0.9)',
                      border: selectedFinger === option.value ? '2px solid #eab308' : '1px solid rgba(234,179,8,0.2)',
                      borderRadius: '8px',
                      cursor: enrolling ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {selectedFinger === option.value && <Check size={16} style={{ marginRight: '0.5rem', color: '#eab308' }} />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Enrollment */}
          {step === 'enroll' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button 
                  onClick={() => selectedMethod === 'fingerprint' ? setStep('finger') : setStep('device')} 
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.5rem' }}
                  disabled={enrolling}
                >
                  ←
                </button>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  {selectedMethod === 'fingerprint' ? 'Fingerprint' : 'Face'} Enrollment
                </h3>
              </div>

              {error && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '1rem', color: '#ef4444', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(30,30,40,0.9)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                  Device: <span style={{ color: '#fff' }}>{selectedDevice?.device_name}</span>
                </div>
                {selectedMethod === 'fingerprint' && (
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                    Finger: <span style={{ color: '#fff' }}>{FINGER_OPTIONS.find(f => f.value === selectedFinger)?.label}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>ZKTeco User ID (must be unique on device)</label>
                <input
                  type="text"
                  value={zktecoUserId}
                  onChange={(e) => setZktecoUserId(e.target.value)}
                  placeholder="e.g. 125"
                  disabled={enrolling}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(30,30,40,0.9)',
                    border: '1px solid rgba(234,179,8,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  This ID will be used to identify the member on the ZKTeco device.
                </p>
              </div>

              {enrollProgress && (
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontSize: '0.9rem' }}>{enrollProgress}</span>
                </div>
              )}

              <button
                onClick={handleEnroll}
                disabled={enrolling || !zktecoUserId}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: enrolling || !zktecoUserId ? 'rgba(234,179,8,0.3)' : '#eab308',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: enrolling || !zktecoUserId ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {enrolling ? 'Enrolling...' : 'Start Enrollment'}
              </button>

              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#22c55e' }}>
                  <strong>Note:</strong> After clicking "Start Enrollment", the user record will be created on the ZKTeco device.
                  {selectedMethod === 'fingerprint' ? ' The member must then place their finger on the device to complete the fingerprint enrollment.' : ' The member must then complete the face enrollment on the device.'}
                </p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(34,197,94,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Check size={32} style={{ color: '#22c55e' }} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#22c55e' }}>Registration Successful!</h3>
              <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                {selectedMethod === 'fingerprint' ? 'Fingerprint' : 'Face'} has been registered for {member.first_name} {member.last_name}
              </p>
              <button
                onClick={resetAndClose}
                style={{
                  padding: '0.75rem 2rem',
                  background: '#eab308',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
