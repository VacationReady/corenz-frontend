"use client";
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="h-screen flex items-center justify-center text-center">
      <div>
        <h1 className="text-3xl font-bold mb-4">Welcome to CoreNZ</h1>
        <p className="text-gray-600">
          Please <a href="/login" className="text-blue-600 underline">log in</a> to continue.
        </p>
      </div>
    </div>
  );
}
