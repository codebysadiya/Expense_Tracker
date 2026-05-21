"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-gray-400 text-lg animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white px-4">

      {/* GLOW BACKGROUND */}
      <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute w-[500px] h-[500px] bg-emerald-400/20 blur-[120px] rounded-full right-0 bottom-0 animate-pulse"></div>

      {/* FLOATING ELEMENTS - LARGE */}
      <div className="absolute w-40 h-40 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl top-[15%] left-[10%] animate-[floatSlow_8s_ease-in-out_infinite]"></div>

      <div className="absolute w-44 h-44 bg-purple-500/10 border border-purple-400/20 rounded-2xl top-[20%] right-[10%] animate-[floatMedium_7s_ease-in-out_infinite]"></div>

      {/* MEDIUM */}
      <div className="absolute w-28 h-28 bg-emerald-400/10 border border-emerald-400/20 rounded-full top-[70%] left-[15%] animate-[floatFast_6s_ease-in-out_infinite]"></div>

      <div className="absolute w-24 h-24 bg-white/10 rounded-full bottom-[15%] right-[20%] animate-[floatMedium_7s_ease-in-out_infinite]"></div>

      <div className="absolute w-32 h-32 bg-white/5 border border-white/10 rounded-xl top-[50%] right-[5%] animate-[floatSlow_9s_ease-in-out_infinite]"></div>

      {/* SMALL (depth particles) */}
      <div className="absolute w-12 h-12 bg-emerald-400/20 rounded-full top-[30%] left-[30%] blur-sm animate-[floatFast_5s_ease-in-out_infinite]"></div>

      <div className="absolute w-10 h-10 bg-purple-400/20 rounded-full bottom-[25%] left-[35%] blur-sm animate-[floatMedium_6s_ease-in-out_infinite]"></div>

      <div className="absolute w-14 h-14 bg-white/10 rounded-full top-[60%] right-[30%] blur-sm animate-[floatFast_5s_ease-in-out_infinite]"></div>

      <div className="absolute w-16 h-16 bg-teal-300/20 rounded-full top-[10%] left-[45%] blur-sm animate-[floatSlow_8s_ease-in-out_infinite]"></div>

      {/* CENTER CONTENT */}
      <div className="relative z-10 text-center max-w-xl">
        
        <h1 className="text-6xl md:text-7xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 text-transparent bg-clip-text">
          ExpenseAI
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed">
          Smarter expense tracking with intelligent insights, clean visuals, 
          and effortless money management.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-7 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-400 to-teal-400 text-black hover:opacity-90 transition shadow-xl"
          >
            Get Started
          </Link>

          <Link
            href="/signup"
            className="px-7 py-3 rounded-xl font-medium border border-white/20 hover:bg-white/10 transition backdrop-blur-md"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* MULTIPLE FLOAT SPEEDS */}
      <style jsx>{`
        @keyframes floatSlow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatMedium {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatFast {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

    </div>
  );
}