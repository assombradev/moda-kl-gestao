"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navegação inferior com 3 abas: Início, Produtos, Config.
 * Fixa no fundo da tela, respeita safe-area-inset-bottom.
 */
const tabs = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/produtos", icon: Package, label: "Produtos" },
  { href: "/configuracoes", icon: Settings, label: "Config" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-h-[44px] min-w-[44px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-xs", isActive && "font-semibold")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
