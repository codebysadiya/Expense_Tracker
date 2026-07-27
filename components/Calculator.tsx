"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Calculator() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const calcRef = useRef<HTMLDivElement>(null);

  function handleToggleCalculator() {
  if (!open) {
    setPos({
      x: window.innerWidth - 280 - 24,
      y: window.innerHeight - 420 - 24,
    });
  }

  setOpen((prev) => !prev);
}

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 420, e.clientY - dragOffset.current.y)),
      });
    }
    function handleMouseUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Calculator logic
  function calculate(a: number, b: number, operator: string): number {
    switch (operator) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  }

  function handleDigit(d: string) {
    if (resetNext) {
      setDisplay(d);
      setResetNext(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  }

  function handleDecimal() {
    if (resetNext) {
      setDisplay("0.");
      setResetNext(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }

  function handleOp(nextOp: string) {
    const current = parseFloat(display);
    if (prev !== null && op && !resetNext) {
      const result = calculate(prev, current, op);
      setDisplay(String(Math.round(result * 1e8) / 1e8));
      setPrev(result);
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setResetNext(true);
  }

  function handleEquals() {
    if (prev !== null && op) {
      const current = parseFloat(display);
      const result = calculate(prev, current, op);
      setDisplay(String(Math.round(result * 1e8) / 1e8));
      setPrev(null);
      setOp(null);
      setResetNext(true);
    }
  }

  function handleClear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setResetNext(false);
  }

  function handleSign() {
    if (display !== "0") {
      setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    }
  }

  function handlePercent() {
    setDisplay(String(parseFloat(display) / 100));
    setResetNext(true);
  }

  function handleBackspace() {
    if (display.length > 1 && !resetNext) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  }

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key >= "0" && e.key <= "9") { handleDigit(e.key); e.preventDefault(); }
      else if (e.key === ".") { handleDecimal(); e.preventDefault(); }
      else if (e.key === "+") { handleOp("+"); e.preventDefault(); }
      else if (e.key === "-") { handleOp("-"); e.preventDefault(); }
      else if (e.key === "*") { handleOp("*"); e.preventDefault(); }
      else if (e.key === "/") { handleOp("/"); e.preventDefault(); }
      else if (e.key === "Enter" || e.key === "=") { handleEquals(); e.preventDefault(); }
      else if (e.key === "Escape") { handleClear(); e.preventDefault(); }
      else if (e.key === "Backspace") { handleBackspace(); e.preventDefault(); }
      else if (e.key === "%") { handlePercent(); e.preventDefault(); }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, display, prev, op, resetNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!user) return null;

  // Mac-style button classes
  const btnBase = "flex items-center justify-center rounded-full text-base font-medium h-12 w-full transition-all active:brightness-75 select-none";
  const btnDigit = `${btnBase} bg-[#505050] hover:bg-[#6a6a6a] text-white`;
  const btnOp = `${btnBase} bg-[#ff9f0a] hover:bg-[#ffb640] text-white text-xl`;
  const btnFunc = `${btnBase} bg-[#a5a5a5] hover:bg-[#c5c5c5] text-black`;
  const btnZero = `${btnBase} bg-[#505050] hover:bg-[#6a6a6a] text-white col-span-2 !rounded-full`;

  return (
    <>
      {/* Floating toggle button */}
<button
  onClick={handleToggleCalculator}
  className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full
             bg-gradient-to-br from-emerald-400 to-purple-500
             text-black shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)]
             hover:shadow-[0_15px_40px_-5px_rgba(16,185,129,0.65)]
             hover:scale-110 active:scale-95
             transition-all duration-300
             flex items-center justify-center"
            aria-label="Calculator"
>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" />
    <line x1="12" y1="10" x2="12" y2="10.01" />
    <line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" />
    <line x1="12" y1="14" x2="12" y2="14.01" />
    <line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="8" y2="18.01" />
    <line x1="12" y1="18" x2="16" y2="18" />
  </svg>
</button>

      {/* Calculator window */}
      {open && (
        <div
          ref={calcRef}
          onMouseDown={handleMouseDown}
          style={{ left: pos.x, top: pos.y }}
          className="fixed z-[60] w-[280px] rounded-2xl overflow-hidden shadow-2xl select-none"
        >
          {/* Title bar - draggable */}
          <div className="bg-[#2a2a2a] flex items-center px-3 py-2 cursor-grab active:cursor-grabbing">
            <div className="flex gap-1.5">
              <button
                onClick={() => setOpen(false)}
                className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-110 border border-[#e0443e]"
                aria-label="Close"
              />
              <div className="h-3 w-3 rounded-full bg-[#febc2e] border border-[#d9a123]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <span className="flex-1 text-center text-[15px] text-gray-200 font-medium">Calculator</span>
          </div>

          {/* Display */}
          <div className="bg-[#1e1e1e] px-5 py-3 text-right">
            <div className="text-white text-4xl font-light tracking-tight truncate font-mono">
              {display.length > 12 ? parseFloat(display).toExponential(6) : display}
            </div>
          </div>

          {/* Buttons */}
          <div className="bg-[#1e1e1e] grid grid-cols-4 gap-[1px] p-2 pt-0">
            <button onClick={handleClear} className={btnFunc}>{display === "0" ? "AC" : "C"}</button>
            <button onClick={handleSign} className={btnFunc}>+/-</button>
            <button onClick={handlePercent} className={btnFunc}>%</button>
            <button onClick={() => handleOp("/")} className={`${btnOp} ${op === "/" && resetNext ? "ring-2 ring-white" : ""}`}>&divide;</button>

            <button onClick={() => handleDigit("7")} className={btnDigit}>7</button>
            <button onClick={() => handleDigit("8")} className={btnDigit}>8</button>
            <button onClick={() => handleDigit("9")} className={btnDigit}>9</button>
            <button onClick={() => handleOp("*")} className={`${btnOp} ${op === "*" && resetNext ? "ring-2 ring-white" : ""}`}>&times;</button>

            <button onClick={() => handleDigit("4")} className={btnDigit}>4</button>
            <button onClick={() => handleDigit("5")} className={btnDigit}>5</button>
            <button onClick={() => handleDigit("6")} className={btnDigit}>6</button>
            <button onClick={() => handleOp("-")} className={`${btnOp} ${op === "-" && resetNext ? "ring-2 ring-white" : ""}`}>&minus;</button>

            <button onClick={() => handleDigit("1")} className={btnDigit}>1</button>
            <button onClick={() => handleDigit("2")} className={btnDigit}>2</button>
            <button onClick={() => handleDigit("3")} className={btnDigit}>3</button>
            <button onClick={() => handleOp("+")} className={`${btnOp} ${op === "+" && resetNext ? "ring-2 ring-white" : ""}`}>+</button>

            <button onClick={() => handleDigit("0")} className={btnZero}>0</button>
            <button onClick={handleDecimal} className={btnDigit}>.</button>
            <button onClick={handleEquals} className={btnOp}>=</button>
          </div>
        </div>
      )}
    </>
  );
}
