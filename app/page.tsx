'use client';
import { useState } from 'react';
import axios from '../lib/api'
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-purple-200">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center text-purple-700">CoreNZ Login</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="mb-2 w-full p-2 border rounded" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mb-4 w-full p-2 border rounded" />
        <button onClick={handleLogin} className="bg-purple-600 text-white w-full p-2 rounded hover:bg-purple-700">Login</button>
      </div>
    </div>
  );
}