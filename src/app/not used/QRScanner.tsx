{/*'use client';

import React, { useEffect, useState } from 'react';
import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import Sidebar from '@/app/sidebar';

export default function QRScannerComponent() {
  const devices = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean, student?: any, message?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (devices.length) {
      // Prioritize front camera
      const frontCamera = devices.find((d) =>
        d.label.toLowerCase().includes('front')
      );
      setSelectedDeviceId(frontCamera?.deviceId || devices[0].deviceId);
    }
  }, [devices]);

  const verifyStudent = async (qrData: string) => {
    setIsLoading(true);
    setScanResult(null);
    
    try {
      const response = await fetch('/api/verify-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData }),
      });

      const result = await response.json();
      setScanResult(result);
    } catch (error) {
      console.error('Verification error:', error);
      setScanResult({
        success: false,
        message: 'Failed to verify student'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-green-700 mb-6">
          Scan Your Receipt QR Code
        </h1>

        {devices.length > 1 && (
          <select
            className="mb-4 p-2 border border-gray-300 rounded w-full"
            value={selectedDeviceId ?? ''}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        )}

        {selectedDeviceId && (
          <Scanner
            onScan={(result) => {
              if (result.length > 0 && !isLoading) {
                verifyStudent(result[0].rawValue);
              }
            }}
            onError={(error) => console.error('Scan Error:', error)}
            constraints={{ deviceId: selectedDeviceId }}
            sound
            formats={['qr_code']}
          />
        )}

        //Display scan results 
        {isLoading && (
          <div className="mt-4 p-4 bg-blue-100 text-blue-800 rounded">
            Verifying student...
          </div>
        )}

        {scanResult && (
          <div className={`mt-4 p-4 rounded ${scanResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {scanResult.success ? (
              <>
                <h3 className="font-bold">Student Verified!</h3>
                <p>Name: {scanResult.student.name}</p>
                <p>ID: {scanResult.student.student_id}</p>
                
                // Add more student details as needed 
              </>
            ) : (
              <p>{scanResult.message || 'Verification failed'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
*/}