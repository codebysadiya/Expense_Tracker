"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.push("/dashboard");
    } catch {
      setError("Could not create account. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4 text-white">

      {/* BACKGROUND GLOW */}
      <div className="absolute w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-emerald-400/20 blur-[120px] rounded-full right-0 bottom-0"></div>
      <div className="absolute w-[450px] h-[450px] bg-pink-500/20 blur-[120px] rounded-full left-0 top-0"></div>

      {/* LIGHT FLOATING ELEMENTS */}
      <div className="absolute w-24 h-24 bg-white/5 border border-white/10 rounded-xl top-[15%] left-[10%] animate-[float_8s_ease-in-out_infinite]"></div>
      <div className="absolute w-20 h-20 bg-emerald-400/10 rounded-full bottom-[20%] right-[15%] animate-[float_6s_ease-in-out_infinite]"></div>
      <div className="absolute w-14 h-14 bg-white/10 rounded-full top-[60%] right-[30%] blur-sm animate-[floatFast_5s_ease-in-out_infinite]"></div>
      <div className="absolute w-12 h-12 bg-emerald-400/20 rounded-full top-[30%] left-[30%] blur-sm animate-[floatFast_5s_ease-in-out_infinite]"></div>
      <div className="absolute w-28 h-28 bg-emerald-400/10 border border-emerald-400/20 rounded-full top-[70%] left-[15%] animate-[floatFast_6s_ease-in-out_infinite]"></div>

      {/* CARD */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 text-transparent bg-clip-text">
          ExpenseAI
        </h1>

        <p className="text-center text-gray-300 mb-8">
          Create your account
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 text-black hover:opacity-90 transition shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* FLOAT ANIMATION */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

    </div>
  );
}