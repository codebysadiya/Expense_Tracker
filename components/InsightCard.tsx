"use client";

import { Insight } from "@/lib/types";

const typeStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", label: "Insight" },
  warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", label: "Warning" },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", label: "Tip" },
  anomaly: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", label: "Anomaly" },
};

export default function InsightCard({ insight }: { insight: Insight }) {
  const style = typeStyles[insight.type] || typeStyles.info;
  return (
    <div className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${style.text} ${style.bg}`}
        >
          {style.label}
        </span>
        <p className={`text-sm ${style.text}`}>{insight.message}</p>
      </div>
      {insight.category && (
        <p className="text-xs text-gray-400 mt-2">Category: {insight.category}</p>
      )}
    </div>
  );
}
