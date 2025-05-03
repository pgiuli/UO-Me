"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/utils/api";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      await registerUser({ username, email, password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold text-center mb-2">Register</h2>
      <label className="flex flex-col font-medium">
        Username
        <input
          type="text"
          value={username}
          autoComplete="username"
          onChange={e => setUsername(e.target.value)}
          required
          className="mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col font-medium">
        Email
        <input
          type="email"
          value={email}
          autoComplete="email"
          onChange={e => setEmail(e.target.value)}
          required
          className="mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col font-medium">
        Password
        <input
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={e => setPassword(e.target.value)}
          required
          className="mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        className="py-2 px-4 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
      >
        Register
      </button>
      {error && <div className="text-red-600 text-center">{error}</div>}
      {success && (
        <div className="text-green-600 text-center">
          Registration successful! Redirecting...
        </div>
      )}
    </form>
  );
}