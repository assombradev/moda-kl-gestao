"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader que imita as dimensões do ProductCard.
 * Usado enquanto os dados de produtos estão carregando.
 */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Área da imagem */}
      <Skeleton className="aspect-video w-full" />
      {/* Conteúdo */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}
