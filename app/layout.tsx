import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Merriweather, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Calculator from "@/components/Calculator";
import AIChat from "@/components/AIChat";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const merriweather = Merriweather({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ExpenseAI - Smart Expense Tracker",
    template: "%s | ExpenseAI",
  },
  description: "Track expenses, set budgets, and get AI-powered insights with behavioral analysis",
  keywords: ["expense tracker", "budget", "finance", "savings", "AI insights"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${merriweather.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <AIChat />
          <Calculator />
        </AuthProvider>
      </body>
    </html>
  );
}