'use client';

import { useState } from 'react';
import axios from '@/lib/api'; // Updated for alias
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await axios.post('/api/auth/login', { email, password }); // fixed route
      localStorage.setItem('token', res.data.token);
      toast.success('Logged in successfully');
      router.push('/dashboard'); // Make sure this route exists under /app/dashboard/page.tsx
    } catch (err) {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-100 to-white">
      <Toaster />
      <div className="bg-white p-10 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-purple-700 mb-6">CoreNZ Login</h1>
        <input
          className="w-full p-3 mb-4 border border-gray-300 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-3 mb-4 border border-gray-300 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded font-semibold"
          onClick={handleLogin}
        >
          Log In
        </button>
      </div>
    </div>
  );
}
