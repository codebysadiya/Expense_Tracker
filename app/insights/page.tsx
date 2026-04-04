"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getExpenses, getBudget } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { fetchInsights } from "@/lib/api";
import { Insight } from "@/lib/types";
import StatCard from "@/components/StatCard";
import InsightCard from "@/components/InsightCard";
import { format } from "date-fns";

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [prediction, setPrediction] = useState<{ predicted: number; dailyAverage: number } | null>(null);
  const [nextMonthPrediction, setNextMonthPrediction] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [expenses, budget] = await Promise.all([
        getExpenses(user.uid),
        getBudget(user.uid, format(new Date(), "yyyy-MM")),
      ]);
      const data = await fetchInsights(expenses, budget?.amount);
      setInsights(data.insights as Insight[]);
      setPrediction(data.prediction);
      setNextMonthPrediction(data.nextMonthPrediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useDataRefresh(loadData);

  if (authLoading || !user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Analyzing your spending...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load insights</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Insights</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {prediction && prediction.predicted > 0 && (
          <StatCard
            label="Predicted End-of-Month Spending"
            value={`$${prediction.predicted.toFixed(2)}`}
            subtext={`Based on $${prediction.dailyAverage.toFixed(2)}/day average`}
          />
        )}
        {nextMonthPrediction !== null && nextMonthPrediction > 0 && (
          <StatCard
            label="Next Month Forecast"
            value={`$${nextMonthPrediction.toFixed(2)}`}
            subtext="Based on historical trend"
          />
        )}
      </div>

      {insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-400">
            Not enough data to generate insights yet. Add more expenses to get personalized recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
