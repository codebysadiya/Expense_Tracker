"use client";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
}

export default function StatCard({ label, value, subtext, subtextColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && (
        <p className={`text-xs mt-1 ${subtextColor || "text-gray-400"}`}>{subtext}</p>
      )}
    </div>
  );
}
