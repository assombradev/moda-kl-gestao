"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SizeRowProps {
  size: string;
  quantity: number | null;
  variantId: string | null;
  onQuantityChange: (newQty: number | null) => void;
  onDelete: () => void;
}

export function SizeRow({
  size,
  quantity,
  variantId,
  onQuantityChange,
  onDelete,
}: SizeRowProps) {
  const [val, setVal] = useState(quantity === null ? "" : String(quantity));

  // Sincroniza quando a prop muda externamente (ex: reset do form)
  useEffect(() => {
    setVal(quantity === null ? "" : String(quantity));
  }, [quantity]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setVal(raw);
    if (raw === "") {
      onQuantityChange(null);
    } else {
      const num = parseInt(raw, 10);
      if (num >= 0) onQuantityChange(num);
    }
  }

  function handleDelete() {
    if (window.confirm(`Deletar tamanho ${size}?`)) {
      onDelete();
    }
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-28 text-sm text-foreground shrink-0">{size}</span>
      <Input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={handleChange}
        placeholder="0"
        className="w-20 h-8 text-center text-sm"
      />
      {variantId !== null ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          className="text-destructive hover:bg-destructive/10 shrink-0"
          aria-label={`Remover tamanho ${size}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ) : (
        // Espaçador para manter alinhamento quando não há botão
        <div className="size-7 shrink-0" />
      )}
    </div>
  );
}
