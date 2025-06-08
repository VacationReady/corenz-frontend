'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ActivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess('Password set! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-2xl">
        <div className="text-center mb-6">
          {/* Inline CoreNZ logo */}
          <div className="flex justify-center mb-3">
            <svg
              width="48"
              height="48"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" rx="20" fill="#000" />
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                fill="white"
                fontSize="28"
                fontFamily="Arial, sans-serif"
                dy=".3em"
              >
                CNZ
              </text>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Activate Your CoreNZ Account</h1>
          <p className="text-sm text-gray-500">Set your password to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Set Password
          </button>
        </form>
      </d
