"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportFullExcel: () => void;
  onExportFullPDF: () => void;
};

export default function ExportMenu({
  onExportExcel,
  onExportPDF,
  onExportFullExcel,
  onExportFullPDF,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>

      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md text-sm text-gray-200 hover:bg-white/10 transition shadow-md hover:shadow-emerald-500/10"
      >
        Export
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-3 w-56 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden z-50">

          {/* Section */}
          <div className="px-4 py-2 text-xs text-gray-400 border-b border-white/10">
            Quick Export
          </div>

          <button
            onClick={() => { setOpen(false); onExportExcel(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition"
          >
            Export Expenses (Excel)
          </button>

          <button
            onClick={() => { setOpen(false); onExportPDF(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition"
          >
            Export Expenses (PDF)
          </button>

          {/* Divider */}
          <div className="border-t border-white/10 my-1"></div>

          {/* Full Report */}
          <div className="px-4 py-2 text-xs text-gray-400">
            Full Report
          </div>

          <button
            onClick={() => { setOpen(false); onExportFullExcel(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-500/10 transition"
          >
            Full Report (Excel)
          </button>

          <button
            onClick={() => { setOpen(false); onExportFullPDF(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-500/10 transition"
          >
            Full Report (PDF)
          </button>

        </div>
      )}
    </div>
  );
}