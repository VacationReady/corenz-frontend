'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Camera, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ClockWidgetProps {
  requireGPS?: boolean;
  requirePhoto?: 'NO' | 'CLOCK_IN' | 'BOTH';
  onClockIn?: (data: ClockData) => Promise<void>;
  onClockOut?: (data: ClockData) => Promise<void>;
}

interface ClockData {
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  photoUrl?: string;
  notes?: string;
}

interface ClockStatus {
  isClockedIn: boolean;
  activeEntry: {
    id: string;
    clockInTime: string;
    clockInLocation?: any;
  } | null;
  duration?: {
    hours: number;
    minutes: number;
  };
}

export default function ClockWidget({
  requireGPS = false,
  requirePhoto = 'NO',
  onClockIn,
  onClockOut,
}: ClockWidgetProps) {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [photoFile, setPhotoFile] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch clock status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/time-tracking/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          resolve(position);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleClockIn = async () => {
    setActionLoading(true);

    try {
      let locationData;

      if (requireGPS) {
        const position = await getCurrentLocation();
        locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      }

      const needsPhoto = requirePhoto === 'CLOCK_IN' || requirePhoto === 'BOTH';
      if (needsPhoto && !photoFile) {
        alert('Please upload a photo to clock in');
        setActionLoading(false);
        return;
      }

      const clockData: ClockData = {
        location: locationData,
        notes,
      };

      let clockInResponse;
      if (onClockIn) {
        await onClockIn(clockData);
      } else {
        const response = await fetch('/api/time-tracking/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clockData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to clock in');
        }

        clockInResponse = await response.json();
      }

      // Upload photo if provided
      if (photoFile && clockInResponse?.entry?.id) {
        try {
          const uploadResponse = await fetch('/api/time-tracking/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entryId: clockInResponse.entry.id,
              photoType: 'clockIn',
              photoBase64: photoFile,
            }),
          });

          if (!uploadResponse.ok) {
            console.error('Photo upload failed, but clock-in succeeded');
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
        }
      }

      // Refresh status
      await fetchStatus();
      setNotes('');
      setPhotoUrl(undefined);
      setPhotoFile(null);
    } catch (error: any) {
      alert(error.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);

    try {
      let locationData;

      if (requireGPS) {
        const position = await getCurrentLocation();
        locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      }

      const needsPhoto = requirePhoto === 'BOTH';
      if (needsPhoto && !photoFile) {
        alert('Please upload a photo to clock out');
        setActionLoading(false);
        return;
      }

      const clockData: ClockData = {
        location: locationData,
        notes,
      };

      let clockOutResponse;
      if (onClockOut) {
        await onClockOut(clockData);
      } else {
        const response = await fetch('/api/time-tracking/clock-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clockData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to clock out');
        }

        clockOutResponse = await response.json();
      }

      // Upload photo if provided
      if (photoFile && status?.activeEntry?.id) {
        try {
          const uploadResponse = await fetch('/api/time-tracking/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entryId: status.activeEntry.id,
              photoType: 'clockOut',
              photoBase64: photoFile,
            }),
          });

          if (!uploadResponse.ok) {
            console.error('Photo upload failed, but clock-out succeeded');
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
        }
      }

      // Refresh status
      await fetchStatus();
      setNotes('');
      setPhotoUrl(undefined);
      setPhotoFile(null);
    } catch (error: any) {
      alert(error.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isClockedIn = status?.isClockedIn || false;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-8">
      {/* Current Time */}
      <div className="text-center mb-8">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {format(currentTime, 'HH:mm:ss')}
        </div>
        <div className="text-gray-600">{format(currentTime, 'EEEE, MMMM d, yyyy')}</div>
      </div>

      {/* Status */}
      {isClockedIn && status?.activeEntry && (
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Clocked In</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {status.duration?.hours || 0}h {status.duration?.minutes || 0}m
          </div>
          <div className="text-sm text-gray-600">
            Started at {format(new Date(status.activeEntry.clockInTime), 'HH:mm')}
          </div>
        </div>
      )}

      {/* Location Info */}
      {requireGPS && location && (
        <div className="bg-white rounded-lg p-4 mb-6 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Current Location</div>
            <div className="text-xs text-gray-600">
              {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            </div>
            <div className="text-xs text-gray-500">
              Accuracy: ±{Math.round(location.coords.accuracy)}m
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload */}
      {((requirePhoto === 'CLOCK_IN' && !isClockedIn) ||
        (requirePhoto === 'BOTH')) && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Camera className="inline h-4 w-4 mr-1" />
            Photo {requirePhoto === 'BOTH' || requirePhoto === 'CLOCK_IN' ? '(Required)' : '(Optional)'}
          </label>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadingPhoto(true);
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64 = e.target?.result as string;
                  setPhotoFile(base64);
                  setPhotoUrl(base64);
                  setUploadingPhoto(false);
                };
                reader.onerror = () => {
                  setUploadingPhoto(false);
                  alert('Failed to read photo file');
                };
                reader.readAsDataURL(file);
              }
            }}
            disabled={uploadingPhoto}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {uploadingPhoto && (
            <p className="text-xs text-gray-500 mt-1">Reading photo...</p>
          )}
          {photoUrl && (
            <div className="mt-2">
              <img
                src={photoUrl}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg border-2 border-blue-200"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          placeholder="Add any notes about your shift..."
        />
      </div>

      {/* Action Button */}
      <button
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        disabled={actionLoading}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
          isClockedIn
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
      >
        {actionLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" />
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </span>
        )}
      </button>
    </div>
  );
}
