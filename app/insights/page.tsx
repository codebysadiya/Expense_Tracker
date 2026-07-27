"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getExpenses, getBudget } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { fetchInsights } from "@/lib/api";
import { Insight } from "@/lib/types";
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
    setError(
      err instanceof Error ? err.message : "Failed to load insights"
    );
  } finally {
    setLoading(false);
  }
}, [user]);

useEffect(() => {
  if (!user) return;

  let cancelled = false;

  const loadInitialData = async () => {
    try {
      const [expenses, budget] = await Promise.all([
        getExpenses(user.uid),
        getBudget(user.uid, format(new Date(), "yyyy-MM")),
      ]);

      const data = await fetchInsights(expenses, budget?.amount);

      if (cancelled) return;

      setInsights(data.insights as Insight[]);
      setPrediction(data.prediction);
      setNextMonthPrediction(data.nextMonthPrediction);
    } catch (err) {
      if (cancelled) return;

      setError(
        err instanceof Error ? err.message : "Failed to load insights"
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadInitialData();

  return () => {
    cancelled = true;
  };
}, [user]);

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
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    {/* HEADER */}
    <div className="mb-8 relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.35)]">

      {/* GLOW EFFECTS */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-400/10 blur-3xl rounded-full"></div>

      <div className="relative z-10">
        <h1 className="font-heading text-4xl font-black bg-linear-to-r from-emerald-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text mb-3">
          AI Insights
        </h1>

        <p className="text-gray-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          Analyze your spending behavior, predict future expenses, and receive smart financial recommendations powered by ExpenseAI.
        </p>
      </div>
    </div>

    {/* STATS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">

      {prediction && prediction.predicted > 0 && (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:scale-[1.02] transition-all duration-300">

          {/* GLOW */}
          <div className="absolute inset-0 bg-linear-to-r from-emerald-400/5 to-cyan-400/5 opacity-0 group-hover:opacity-100 transition"></div>

          <div className="relative z-10">

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center border border-emerald-400/20">
                <span className="text-2xl">📈</span>
              </div>

              <span className="text-xs text-emerald-400 font-medium px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                Prediction
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-2">
              Predicted End-of-Month Spending
            </p>

            <h2 className="text-4xl font-black text-white mb-2">
              ${prediction.predicted.toFixed(2)}
            </h2>

            <p className="text-sm text-gray-400">
              Based on{" "}
              <span className="text-cyan-400 font-medium">
                ${prediction.dailyAverage.toFixed(2)}/day
              </span>{" "}
              average
            </p>

          </div>
        </div>
      )}

      {nextMonthPrediction !== null && nextMonthPrediction > 0 && (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:scale-[1.02] transition-all duration-300">

          {/* GLOW */}
          <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition"></div>

          <div className="relative z-10">

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-400/20">
                <span className="text-2xl">🔮</span>
              </div>

              <span className="text-xs text-purple-300 font-medium px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/20">
                Forecast
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-2">
              Next Month Forecast
            </p>

            <h2 className="text-4xl font-black text-white mb-2">
              ${nextMonthPrediction.toFixed(2)}
            </h2>

            <p className="text-sm text-gray-400">
              Based on historical spending trends
            </p>

          </div>
        </div>
      )}

    </div>

    {/* INSIGHTS */}
    {insights.length > 0 ? (
      <div className="space-y-5">

        {insights.map((insight, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:bg-white/[0.07] transition-all duration-300"
          >

            {/* HOVER GLOW */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-linear-to-r from-cyan-400/[0.03] via-purple-500/[0.03] to-emerald-400/[0.03]"></div>

            <div className="relative z-10">
              <InsightCard insight={insight} />
            </div>

          </div>
        ))}

      </div>
    ) : (
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-12 text-center shadow-lg">

        {/* GLOW */}
        <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-emerald-400/5"></div>

        <div className="relative z-10">

          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">
            <span className="text-4xl">🧠</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Not Enough Data Yet
          </h2>

          <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
            Add more expenses to unlock personalized AI insights, spending predictions, and financial recommendations.
          </p>

        </div>
      </div>
    )}

  </div>
);
}
