'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { FaMicrosoft } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) throw new Error('Invalid credentials')

      const data = await res.json()
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-md rounded px-8 py-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to CoreNZ</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">or continue with</div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            className="flex items-center justify-center border px-4 py-2 rounded hover:bg-gray-100 w-full"
            onClick={() => alert('Google login placeholder')}
          >
            <FcGoogle className="mr-2 text-xl" /> Login with Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center border px-4 py-2 rounded hover:bg-gray-100 w-full"
            onClick={() => alert('Microsoft login placeholder')}
          >
            <FaMicrosoft className="mr-2 text-xl text-blue-700" /> Login with Microsoft
          </button>
        </div>
      </div>
    </div>
  )
}
