"use client";

import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportFullExcel?: () => void;
  onExportFullPDF?: () => void;
}

export default function ExportMenu({ onExportExcel, onExportPDF, onExportFullExcel, onExportFullPDF }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
          <button onClick={() => { onExportExcel(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <span className="text-green-600 font-mono text-xs font-bold">.xlsx</span> Expenses (Excel)
          </button>
          <button onClick={() => { onExportPDF(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <span className="text-red-600 font-mono text-xs font-bold">.pdf</span> Expenses (PDF)
          </button>
          {onExportFullExcel && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { onExportFullExcel(); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span className="text-green-600 font-mono text-xs font-bold">.xlsx</span> Full Report (Excel)
              </button>
            </>
          )}
          {onExportFullPDF && (
            <button onClick={() => { onExportFullPDF(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <span className="text-red-600 font-mono text-xs font-bold">.pdf</span> Full Report (PDF)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
