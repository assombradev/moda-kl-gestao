"use client";

import { QuickQtyButtons } from "./QuickQtyButtons";

/**
 * Linha de variante mostrando cor (chip colorido), tamanho, quantidade e botões +/-.
 */
interface VariantRowProps {
  color: string; // Nome da cor
  colorHex: string; // Hex da cor (ou gradiente CSS)
  size: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export function VariantRow({
  color,
  colorHex,
  size,
  quantity,
  onIncrement,
  onDecrement,
  disabled,
}: VariantRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        {/* Chip de cor */}
        <div
          className="w-6 h-6 rounded-full border border-border shadow-sm flex-shrink-0"
          style={{ background: colorHex }}
          title={color}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{color}</span>
          <span className="text-xs text-muted-foreground">Tam: {size}</span>
        </div>
      </div>

      <QuickQtyButtons
        quantity={quantity}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        disabled={disabled}
      />
    </div>
  );
}
