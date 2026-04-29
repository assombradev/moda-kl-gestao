"use client";

import { FloatingLogo } from "./FloatingLogo";

/**
 * Header superior do app com saudação e logo flutuante.
 * Respeita safe-area-inset-top para iPhones com notch.
 */
export function Header({ userName }: { userName?: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border safe-top">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">
            {userName ? `Olá, ${userName}` : "Moda KL"}
          </span>
          <span className="text-lg font-semibold text-foreground">Gestão de Estoque</span>
        </div>
        <FloatingLogo size={40} />
      </div>
    </header>
  );
}
