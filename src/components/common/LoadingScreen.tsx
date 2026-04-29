"use client";

import { FloatingLogo } from "@/components/layout/FloatingLogo";

/**
 * Tela de carregamento com logo animada centralizada.
 * Usada durante transições de autenticação ou carregamento inicial.
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
      <FloatingLogo size={64} />
      <p className="mt-6 text-sm text-muted-foreground animate-pulse">
        Carregando...
      </p>
    </div>
  );
}
