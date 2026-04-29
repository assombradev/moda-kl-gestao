"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

/**
 * Toggle de tema com 3 estados: Claro, Escuro, Sistema.
 * Persiste preferência no localStorage e aplica classe .dark no html.
 */
function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("moda-kl-theme") as Theme) || "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // Sistema: segue preferência do OS
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    localStorage.setItem("moda-kl-theme", theme);
  }, [theme]);

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="w-4 h-4" />, label: "Claro" },
    { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Escuro" },
    { value: "system", icon: <Monitor className="w-4 h-4" />, label: "Sistema" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all min-h-[44px]",
            theme === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={opt.label}
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
