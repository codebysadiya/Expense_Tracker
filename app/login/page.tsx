"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
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
      <div className="absolute w-24 h-24 bg-white/5 border border-white/10 rounded-xl top-[20%] left-[12%] animate-[float_8s_ease-in-out_infinite]"></div>
      <div className="absolute w-20 h-20 bg-emerald-400/10 rounded-full bottom-[18%] right-[18%] animate-[float_6s_ease-in-out_infinite]"></div>
      {/* EXTRA FLOATING ELEMENTS */}

      {/* Medium circle */}
      <div className="absolute w-24 h-24 bg-emerald-400/10 rounded-full top-[65%] left-[25%] animate-[floatMedium_7s_ease-in-out_infinite]"></div>

      {/* Right side soft square */}
      <div className="absolute w-28 h-28 bg-purple-400/10 border border-purple-400/20 rounded-xl top-[40%] right-[8%] animate-[floatSlow_10s_ease-in-out_infinite]"></div>

      {/* Small particles */}
      <div className="absolute w-12 h-12 bg-white/10 rounded-full top-[25%] right-[30%] blur-sm animate-[floatFast_6s_ease-in-out_infinite]"></div>

      <div className="absolute w-10 h-10 bg-emerald-300/20 rounded-full bottom-[30%] left-[35%] blur-sm animate-[floatFast_5s_ease-in-out_infinite]"></div>

      <div className="absolute w-14 h-14 bg-purple-300/20 rounded-full bottom-[10%] right-[30%] blur-sm animate-[floatMedium_7s_ease-in-out_infinite]"></div>

      {/* CARD */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 text-transparent bg-clip-text">
          Welcome Back
        </h1>

        <p className="text-center text-gray-300 mb-8">
          Sign in to continue to ExpenseAI
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
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
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 text-white border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 text-black hover:opacity-90 transition shadow-lg disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* FLOAT ANIMATION */}
      <style jsx>{`
        @keyframes floatSlow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatMedium {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatFast {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

    </div>
  );
}