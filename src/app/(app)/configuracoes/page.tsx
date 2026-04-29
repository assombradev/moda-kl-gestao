"use client";

import { useRouter } from "next/navigation";
import {
  Lock,
  Palette,
  Tags,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Separator } from "@/components/ui/separator";

/**
 * Página de configurações (estilo lista iOS).
 * Itens: Trocar PIN, Tema, Modelos cadastrados, Cores, Sair.
 */

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  action?: () => void;
  destructive?: boolean;
}

export default function ConfiguracoesPage() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  }

  const items: SettingsItem[] = [
    { icon: <Lock className="w-5 h-5" />, label: "Trocar PIN", href: "/configuracoes/trocar-pin" },
    { icon: <Tags className="w-5 h-5" />, label: "Modelos cadastrados", href: "/configuracoes/modelos" },
    { icon: <Palette className="w-5 h-5" />, label: "Cores", href: "/configuracoes/cores" },
  ];

  return (
    <div
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {/* Tema */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Tema</p>
        <ThemeToggle />
      </div>

      {/* Lista de itens */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {items.map((item, idx) => (
          <div key={item.label}>
            <button
              onClick={() => item.href ? router.push(item.href) : item.action?.()}
              className="flex items-center justify-between w-full px-4 py-4 hover:bg-muted/50 transition-colors min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{item.icon}</div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {idx < items.length - 1 && <Separator className="ml-12" />}
          </div>
        ))}
      </div>

      {/* Sair */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-destructive/5 transition-colors min-h-[56px]"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">Sair</span>
        </button>
      </div>
    </div>
  );
}
