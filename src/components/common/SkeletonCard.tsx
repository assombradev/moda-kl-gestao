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
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}
