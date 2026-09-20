import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MemberSearchSelect from '../components/MemberSearchSelect';
import faceBiometricsAPI from '../api/gym/faceBiometrics';
import { branchesAPI } from '../api/gym/branches';

export default function FaceRegistrationPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [biometricStatus, setBiometricStatus] = useState(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      checkBiometricStatus(selectedMember.id);
    }
  }, [selectedMember]);

  const loadBranches = async () => {
    try {
      const res = await branchesAPI.getAll();
      setBranches(Array.isArray(res.data) ? res.data : (res.data?.items || []));
      const branchesList = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      if (branchesList.length > 0) {
        setSelectedBranch(branchesList[0].id);
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to load branches' });
    }
  };

  const checkBiometricStatus = async (memberId) => {
    try {
      const { data } = await faceBiometricsAPI.getStatus(memberId);
      setBiometricStatus(data);
    } catch (error) {
      setBiometricStatus(null);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Camera access denied or unavailable' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleRegister = async () => {
    if (!selectedMember || !capturedImage || !selectedBranch) {
      setStatus({ type: 'error', message: 'Please select member, branch, and capture image' });
      return;
    }

    setIsRegistering(true);
    setStatus({ type: '', message: '' });

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

      const { data } = await faceBiometricsAPI.register(selectedMember.id, {
        image: file,
        branch_id: selectedBranch
      });

      if (data.success) {
        setStatus({ 
          type: 'success', 
          message: `Face registered successfully! Quality score: ${(data.quality_score * 100).toFixed(1)}%` 
        });
        setCapturedImage(null);
        checkBiometricStatus(selectedMember.id);
      } else {
        setStatus({ type: 'error', message: data.message || 'Registration failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.detail || 'Registration failed' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteBiometric = async () => {
    if (!selectedMember) return;
    
    if (!window.confirm('Are you sure you want to delete this face registration?')) {
      return;
    }

    try {
      await faceBiometricsAPI.delete(selectedMember.id);
      setStatus({ type: 'success', message: 'Face registration deleted' });
      setBiometricStatus(null);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete registration' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Face Biometric Registration</h1>
        <button
          onClick={() => navigate('/members')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to Members
        </button>
      </div>

      {/* Member Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Member</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member
            </label>
            <MemberSearchSelect
              value={selectedMember?.id}
              onChange={(id) => {
                const member = selectedMember;
                if (member && member.id === id) return;
                setSelectedMember(null);
                setBiometricStatus(null);
                setCapturedImage(null);
              }}
              onMemberSelect={(member) => setSelectedMember(member)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMember && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Member:</strong> {selectedMember.full_name} ({selectedMember.member_code})
            </p>
            {biometricStatus && biometricStatus.has_biometric ? (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-green-600">
                  ✓ Face registered (Active: {biometricStatus.is_active ? 'Yes' : 'No'})
                </p>
                <button
                  onClick={handleDeleteBiometric}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Delete Registration
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No face registration found</p>
            )}
          </div>
        )}
      </div>

      {/* Camera/Capture Section */}
      {selectedMember && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Capture Face</h2>
          
          {!capturedImage ? (
            <div className="space-y-4">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Start Camera
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg bg-black"
                      style={{ maxHeight: '480px' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-4 border-blue-500 rounded-full opacity-50"></div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={captureImage}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full rounded-lg max-w-md mx-auto"
              />
              <div className="flex gap-4">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Retake Photo
                </button>
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {isRegistering ? 'Registering...' : 'Register Face'}
                </button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Status Messages */}
      {status.message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure good lighting - face should be clearly visible</li>
          <li>• Position face within the circular guide</li>
          <li>• Remove glasses, hats, or face coverings</li>
          <li>• Look directly at the camera with a neutral expression</li>
          <li>• Keep a distance of about 1-2 feet from the camera</li>
        </ul>
      </div>
    </div>
  );
}
