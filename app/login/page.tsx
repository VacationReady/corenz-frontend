"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

        {error && <p className="text-red-600 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>

        <div className="my-6 border-t pt-6">
          <p className="text-sm text-center mb-4 text-gray-500">Or sign in with</p>
          <div className="flex flex-col space-y-3">
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 border border-gray-300 py-2 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Microsoft_logo.svg"
                alt="Microsoft"
                className="h-5 w-5"
              />
              Continue with Microsoft
            </button>

            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 border border-gray-300 py-2 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                alt="Google"
                className="h-5 w-5"
              />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
