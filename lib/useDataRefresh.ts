"use client";

import { useEffect } from "react";

export function useDataRefresh(callback: () => void) {
  useEffect(() => {
    function handler() {
      callback();
    }
    window.addEventListener("expense-data-changed", handler);
    return () => window.removeEventListener("expense-data-changed", handler);
  }, [callback]);
}
