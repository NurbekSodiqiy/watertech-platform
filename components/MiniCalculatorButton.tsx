"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";

type Op = "+" | "-" | "×" | "÷";

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

/** Plain arithmetic popup — a phone-style calculator, not connected to any
 * product/package/pricing data (that's /tools/calculator, a separate,
 * unrelated page). Lives next to ThemeToggle in TopBar's right-side icon
 * group, same open/close-on-outside-click pattern as AvatarMenu's dropdown
 * right beside it. State intentionally isn't persisted — closing the popup
 * (or navigating away, since TopBar itself doesn't unmount) is a fine time
 * to lose an in-progress sum. */
export function MiniCalculatorButton() {
  const t = useTranslations("chrome.miniCalculator");
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Op | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Back to the calculator icon rather than the top of the document.
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function reset() {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }

  function inputDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }

  function inputDecimal() {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function handleOperator(nextOperator: Op) {
    const inputValue = parseFloat(display);
    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = compute(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(result);
    }
    setWaitingForOperand(true);
    setOperator(nextOperator);
  }

  function handleEquals() {
    if (operator === null || previousValue === null) return;
    const result = compute(previousValue, parseFloat(display), operator);
    setDisplay(String(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  const keyClass =
    "flex h-10 items-center justify-center rounded-lg border border-border bg-surface-alt text-[15px] font-medium text-primary-dark transition-colors hover:bg-surface";
  const opKeyClass =
    "flex h-10 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-[15px] font-semibold text-accent transition-colors hover:bg-accent/20";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-dark hover:bg-primary/10"
      >
        <Calculator size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("label")}
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          <div
            role="status"
            aria-live="polite"
            className="mb-3 overflow-x-auto rounded-lg border border-border bg-surface-alt px-3 py-3 text-right text-[22px] font-semibold text-primary-dark"
          >
            {display}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" className={`${keyClass} col-span-2`} onClick={reset}>
              C
            </button>
            <button type="button" className={opKeyClass} onClick={() => handleOperator("÷")}>
              ÷
            </button>
            <button type="button" className={opKeyClass} onClick={() => handleOperator("×")}>
              ×
            </button>

            <button type="button" className={keyClass} onClick={() => inputDigit("7")}>
              7
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("8")}>
              8
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("9")}>
              9
            </button>
            <button type="button" className={opKeyClass} onClick={() => handleOperator("-")}>
              -
            </button>

            <button type="button" className={keyClass} onClick={() => inputDigit("4")}>
              4
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("5")}>
              5
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("6")}>
              6
            </button>
            <button type="button" className={opKeyClass} onClick={() => handleOperator("+")}>
              +
            </button>

            <button type="button" className={keyClass} onClick={() => inputDigit("1")}>
              1
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("2")}>
              2
            </button>
            <button type="button" className={keyClass} onClick={() => inputDigit("3")}>
              3
            </button>
            <button type="button" className={opKeyClass} onClick={handleEquals}>
              =
            </button>

            <button type="button" className={`${keyClass} col-span-3`} onClick={() => inputDigit("0")}>
              0
            </button>
            <button type="button" className={keyClass} onClick={inputDecimal}>
              .
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
