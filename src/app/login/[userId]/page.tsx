"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Delete, ArrowLeft } from "lucide-react";
import { FloatingLogo } from "@/components/layout/FloatingLogo";
import { cn } from "@/lib/utils";

/**
 * Tela de PIN - 4 quadrados grandes + teclado numérico customizado.
 * Não usa teclado nativo. Ao completar 4 dígitos, faz POST /api/auth/login.
 * Em erro: animação shake nos quadrados. Em sucesso: redireciona /dashboard.
 */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

export default function PinPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");

  // Busca o nome do usuário pelo UUID
  useEffect(() => {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        const user = data.users?.find((u: { id: string }) => u.id === userId);
        if (user) setUserName(user.name);
      })
      .catch(() => {});
  }, [userId]);

  const handleKeyPress = useCallback(
    async (key: string) => {
      if (isLoading) return;

      if (key === "delete") {
        setPin((prev) => prev.slice(0, -1));
        setError(false);
        return;
      }

      if (pin.length >= 4) return;

      const newPin = [...pin, key];
      setPin(newPin);

      // Quando completar 4 dígitos, tenta autenticar
      if (newPin.length === 4) {
        setIsLoading(true);
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, pin: newPin.join("") }),
          });

          if (res.ok) {
            router.push("/dashboard");
          } else {
            // Erro: shake animation
            setError(true);
            setTimeout(() => {
              setPin([]);
              setError(false);
            }, 600);
          }
        } catch {
          setError(true);
          setTimeout(() => {
            setPin([]);
            setError(false);
          }, 600);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [pin, isLoading, userId, router]
  );

  return (
    <div className="flex flex-col items-center min-h-dvh px-6 py-8 bg-background safe-top safe-bottom">
      {/* Botão voltar */}
      <div className="w-full max-w-sm mb-8">
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Logo e saudação */}
      <div className="flex flex-col items-center mb-10">
        <FloatingLogo size={48} />
        <h1 className="text-xl font-bold text-foreground mt-4">Olá, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Digite seu PIN de 4 dígitos</p>
      </div>

      {/* Quadrados do PIN */}
      <motion.div
        className="flex gap-4 mb-12"
        animate={error ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all",
              pin[i]
                ? "border-primary bg-primary/10"
                : "border-border",
              error && "border-destructive bg-destructive/10"
            )}
          >
            {pin[i] && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 rounded-full bg-primary"
              />
            )}
          </div>
        ))}
      </motion.div>

      {/* Teclado numérico customizado */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key, idx) => {
          if (key === "") {
            return <div key={idx} />;
          }

          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleKeyPress(key)}
              disabled={isLoading}
              className={cn(
                "h-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-colors",
                key === "delete"
                  ? "bg-muted text-muted-foreground"
                  : "bg-card border border-border text-foreground hover:bg-muted active:bg-primary/10"
              )}
            >
              {key === "delete" ? <Delete className="w-6 h-6" /> : key}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
