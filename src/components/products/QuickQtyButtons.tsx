"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botões rápidos de incremento/decremento de quantidade.
 * Minus desabilitado quando quantidade é 0.
 */
interface QuickQtyButtonsProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export function QuickQtyButtons({
  quantity,
  onIncrement,
  onDecrement,
  disabled = false,
}: QuickQtyButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= 0 || disabled}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border border-border",
          "transition-all active:scale-90",
          quantity <= 0 || disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-muted active:bg-primary/10"
        )}
        aria-label="Diminuir quantidade"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span className="min-w-[2rem] text-center font-semibold text-base tabular-nums">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border border-border",
          "transition-all active:scale-90",
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-muted active:bg-primary/10"
        )}
        aria-label="Aumentar quantidade"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
