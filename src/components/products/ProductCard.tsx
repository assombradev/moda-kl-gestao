"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Card de produto mostrando foto, nome, categoria, SKU, total de peças e status.
 * Animações de hover/tap com framer-motion.
 */

/** Info completa de cada variante para exibir no card */
interface VariantInfo {
  color: string;
  colorHex: string;
  size: string;
  quantity: number;
}

interface ProductCardProps {
  id: string;
  name: string;
  photoUrl?: string;
  category: string;
  model: string;
  skuBase: string;
  totalPieces: number;
  /** Todas as variantes do produto (cor + tamanho + quantidade) */
  variants?: VariantInfo[];
}

/**
 * Determina o status geral do produto.
 * - Esgotado: todas as variantes com quantidade 0
 * - Baixo: alguma variante com quantidade entre 1 e 4
 * - Em estoque: todas com quantidade > 4
 */
function getStatus(totalPieces: number, variants?: VariantInfo[]) {
  if (totalPieces === 0) return { label: "Esgotado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  const hasLow = variants?.some((v) => v.quantity > 0 && v.quantity <= 4);
  if (hasLow) return { label: "Baixo", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
  return { label: "Em estoque", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
}

export function ProductCard({
  id,
  name,
  photoUrl,
  category,
  model,
  skuBase,
  totalPieces,
  variants,
}: ProductCardProps) {
  const status = getStatus(totalPieces, variants);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link
        href={`/produtos/${id}`}
        className="block rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Foto do produto */}
        <div className="aspect-video bg-muted relative overflow-hidden">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-3xl">👙</span>
            </div>
          )}
          {/* Badge de status */}
          <div className="absolute top-2 right-2">
            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", status.className)}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Informações */}
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
            {name}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          </div>

          {/* Lista de variantes: Cor + Tamanho + Quantidade */}
          {variants && variants.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {variants.map((v, i) => {
                const isLow = v.quantity > 0 && v.quantity <= 4;
                const isEmpty = v.quantity === 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border",
                      isEmpty
                        ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        : isLow
                        ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400"
                        : "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                      style={{ background: v.colorHex }}
                    />
                    <span>{v.size}</span>
                    <span className="font-bold">{v.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
