"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página para trocar o PIN do usuário logado.
 * Solicita PIN atual, novo PIN (digitado 2x) e confirma a alteração.
 * Altera SOMENTE o PIN do usuário autenticado na sessão.
 */

export default function TrocarPinPage() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validações
    if (currentPin.length !== 4) {
      setError("O PIN atual deve ter 4 dígitos");
      return;
    }
    if (newPin.length !== 4) {
      setError("O novo PIN deve ter 4 dígitos");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Os novos PINs não coincidem");
      return;
    }
    if (currentPin === newPin) {
      setError("O novo PIN deve ser diferente do atual");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/configuracoes"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao trocar PIN");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">PIN alterado!</h2>
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </motion.div>
    );
  }

  return (
    <div
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Trocar PIN</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Digite seu PIN atual e escolha um novo PIN de 4 dígitos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* PIN atual */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">PIN atual</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl border border-border bg-card focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>

        {/* Novo PIN */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Novo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl border border-border bg-card focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>

        {/* Confirmar novo PIN */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirmar novo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl border border-border bg-card focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>

        {/* Erro */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl"
          >
            {error}
          </motion.p>
        )}

        {/* Botão confirmar */}
        <Button
          type="submit"
          disabled={loading || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
          className="w-full h-14 text-base font-semibold rounded-xl"
        >
          {loading ? "Alterando..." : "Confirmar alteração"}
        </Button>
      </form>
    </div>
  );
}
