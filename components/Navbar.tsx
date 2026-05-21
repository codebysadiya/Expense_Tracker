"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "🧭Dashboard" },
  { href: "/expenses", label: "💸Expenses" },
  { href: "/budget", label: "📊Budget" },
  { href: "/insights", label: "📈Insights" },
  { href: "/savings", label: "💰Savings" },
  { href: "/debts", label: "💳Debts" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initials = user.email ? user.email[0].toUpperCase() : "U";

  return (
  <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="flex justify-between h-16 items-center">

        {/* LEFT */}
        <div className="flex items-center gap-2">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 text-transparent bg-clip-text mr-6"
          >
            ExpenseAI
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === item.href
                    ? "text-white bg-white/10"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}

                {/* Underline animation */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] bg-emerald-400 transition-all ${
                    pathname === item.href ? "w-full" : "w-0"
                  }`}
                ></span>
              </Link>
            ))}
          </div>

        </div>

        {/* RIGHT (Profile) */}
        <div className="flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-purple-400 text-black flex items-center justify-center text-sm font-semibold shadow-md hover:scale-105 transition"
            aria-label="Profile menu"
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="absolute right-4 top-14 w-64 bg-black/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/10 py-2 z-50">

              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-medium text-white truncate">
                  {user.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  signOut();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                Sign Out
              </button>

            </div>
          )}
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="md:hidden flex gap-2 pb-3 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${
              pathname === item.href
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

    </div>
  </nav>
);
}
