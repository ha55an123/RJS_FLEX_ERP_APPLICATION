import React, { useState, useRef, useEffect } from 'react';
import faceBiometricsAPI from '../api/gym/faceBiometrics';
import { branchesAPI } from '../api/gym/branches';

export default function FaceAttendancePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [autoRecognize, setAutoRecognize] = useState(false);
  const recognitionIntervalRef = useRef(null);

  useEffect(() => {
    loadBranches();
    return () => {
      stopCamera();
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, []);

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
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
  };

  const captureAndRecognize = async () => {
    if (!isCameraActive || !selectedBranch) {
      setStatus({ type: 'error', message: 'Camera not active or branch not selected' });
      return;
    }

    setIsRecognizing(true);
    setStatus({ type: '', message: '' });

    try {
      // Capture frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
          
          const { data } = await faceBiometricsAPI.recognize({
            image: file,
            branch_id: selectedBranch
          });

          setRecognitionResult(data);

          if (data.recognized) {
            setStatus({ 
              type: 'success', 
              message: `Recognized: ${data.member_name} (${data.member_code}) - Confidence: ${(data.confidence * 100).toFixed(1)}%${data.attendance_recorded ? ' - Attendance Recorded!' : ''}` 
            });
          } else {
            setStatus({ 
              type: 'warning', 
              message: data.message || 'Face not recognized' 
            });
          }
        } catch (error) {
          setStatus({ type: 'error', message: error.response?.data?.detail || 'Recognition failed' });
        } finally {
          setIsRecognizing(false);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to capture image' });
      setIsRecognizing(false);
    }
  };

  const toggleAutoRecognize = () => {
    if (autoRecognize) {
      setAutoRecognize(false);
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    } else {
      setAutoRecognize(true);
      captureAndRecognize();
      recognitionIntervalRef.current = setInterval(captureAndRecognize, 3000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Face Recognition Attendance</h1>
      </div>

      {/* Branch Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Branch</h2>
        <div className="max-w-xs">
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

      {/* Camera Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Face Recognition</h2>
        
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
                <div className="w-48 h-48 border-4 border-green-500 rounded-full opacity-50"></div>
              </div>
              {isRecognizing && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  Recognizing...
                </div>
              )}
              {autoRecognize && (
                <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                  Auto: ON
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={captureAndRecognize}
                disabled={isRecognizing}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {isRecognizing ? 'Recognizing...' : 'Recognize Face'}
              </button>
              <button
                onClick={toggleAutoRecognize}
                disabled={isRecognizing}
                className={`flex-1 py-3 text-white rounded-lg font-medium disabled:opacity-50 ${
                  autoRecognize ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {autoRecognize ? 'Stop Auto' : 'Auto Recognize'}
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
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Recognition Result */}
      {recognitionResult && (
        <div className={`rounded-lg p-6 mb-6 ${
          recognitionResult.recognized 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-yellow-50 border-2 border-yellow-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4">
            {recognitionResult.recognized ? '✓ Face Recognized' : '⚠ Face Not Recognized'}
          </h3>
          
          {recognitionResult.recognized ? (
            <div className="space-y-2">
              <p><strong>Member:</strong> {recognitionResult.member_name}</p>
              <p><strong>Member Code:</strong> {recognitionResult.member_code}</p>
              <p><strong>Confidence:</strong> {(recognitionResult.confidence * 100).toFixed(1)}%</p>
              <p><strong>Attendance Recorded:</strong> {recognitionResult.attendance_recorded ? 'Yes ✓' : 'No (duplicate within 1 hour)'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p><strong>Message:</strong> {recognitionResult.message}</p>
              {recognitionResult.confidence > 0 && (
                <p><strong>Closest Match Confidence:</strong> {(recognitionResult.confidence * 100).toFixed(1)}%</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {status.message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            status.type === 'success' ? 'bg-green-50 text-green-800' : 
            status.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            'bg-red-50 text-red-800'
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
          <li>• Remove glasses, hats, or face coverings for better recognition</li>
          <li>• Look directly at the camera</li>
          <li>• Use "Auto Recognize" for continuous attendance recording</li>
          <li>• Duplicate attendance within 1 hour will be prevented</li>
        </ul>
      </div>
    </div>
  );
}
