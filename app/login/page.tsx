"use client";
export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email: formData.email,
      password: formData.password,
      callbackUrl: "/dashboard",
    });

    console.log("🔁 signIn response:", res);

    if (res?.error) {
      setError("Invalid email or password");
    } else if (res?.ok) {
      // Ensure session is available before redirecting
      const session = await getSession();
      console.log("🟢 Session after login:", session);

      if (session) {
        router.push(res.url || "/dashboard");
      } else {
        setError("Login succeeded but session not yet available.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="flex justify-center mb-6">
          <h1 className="text-3xl font-bold text-black">CoreNZ</h1>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>

        {error && (
          <p className="mb-4 text-center text-red-600 font-semibold">{error}</p>
        )}

        <form onSubmit={handleSubmit} c
