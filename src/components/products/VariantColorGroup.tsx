"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { AccordionContent } from "@/components/ui/accordion";
import { SizeRow } from "./SizeRow";
import { cn } from "@/lib/utils";

interface SizeEntry {
  size: string;
  quantity: number | null;
  variantId: string | null;
}

interface VariantColorGroupProps {
  colorId: string;
  colorName: string;
  colorHex: string;
  isGradient: boolean;
  gradientHex2: string | null;
  sizes: SizeEntry[];
  onSizeQuantityChange: (size: string, newQty: number | null) => void;
  onSizeDelete: (size: string) => void;
  onColorRemove: () => void;
}

export function VariantColorGroup({
  colorId,
  colorName,
  colorHex,
  isGradient,
  gradientHex2,
  sizes,
  onSizeQuantityChange,
  onSizeDelete,
  onColorRemove,
}: VariantColorGroupProps) {
  const swatchStyle =
    isGradient && gradientHex2
      ? { background: `linear-gradient(135deg, ${colorHex}, ${gradientHex2})` }
      : { background: colorHex };

  const sizesWithQty = sizes.filter(
    (s) => s.quantity !== null && s.quantity > 0
  );
  const totalQty = sizes.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
  const summary =
    sizesWithQty.length > 0
      ? `${sizesWithQty.length} tam., ${totalQty} ${totalQty === 1 ? "peça" : "peças"}`
      : "Sem estoque";

  function handleColorRemove() {
    if (
      window.confirm(
        `Remover a cor ${colorName} do produto? Todas as variações desta cor serão deletadas.`
      )
    ) {
      onColorRemove();
    }
  }

  return (
    <AccordionPrimitive.Item
      value={colorId}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <AccordionPrimitive.Header className="flex items-stretch">
        <AccordionPrimitive.Trigger
          className={cn(
            "group/trigger flex flex-1 items-center gap-2.5 px-3 py-3",
            "text-sm font-medium transition-colors outline-none",
            "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        >
          <div
            className="w-5 h-5 rounded-full border border-border shrink-0"
            style={swatchStyle}
          />
          <span className="font-medium text-foreground truncate">
            {colorName}
          </span>
          <span className="text-xs text-muted-foreground ml-auto mr-1 shrink-0">
            {summary}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground pointer-events-none group-aria-expanded/trigger:hidden" />
          <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground pointer-events-none hidden group-aria-expanded/trigger:inline" />
        </AccordionPrimitive.Trigger>

        <button
          type="button"
          onClick={handleColorRemove}
          className={cn(
            "px-3 text-muted-foreground shrink-0",
            "border-l border-border",
            "hover:text-destructive hover:bg-muted/50 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
          aria-label={`Remover cor ${colorName}`}
        >
          <X className="w-4 h-4" />
        </button>
      </AccordionPrimitive.Header>

      <AccordionContent className="border-t border-border">
        <div className="px-3 pt-1 pb-0">
          {sizes.map((entry) => (
            <SizeRow
              key={entry.size}
              size={entry.size}
              quantity={entry.quantity}
              variantId={entry.variantId}
              onQuantityChange={(newQty) =>
                onSizeQuantityChange(entry.size, newQty)
              }
              onDelete={() => onSizeDelete(entry.size)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionPrimitive.Item>
  );
}
