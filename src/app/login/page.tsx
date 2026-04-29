"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FloatingLogo } from "@/components/layout/FloatingLogo";

/**
 * Página de login - busca usuários do banco e mostra cards animados.
 * Ao tocar em um card, navega para /login/[userId] (UUID real) para digitar PIN.
 */

interface User {
  id: string;
  name: string;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 20 } },
};

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  // Busca usuários do banco ao carregar a página
  useEffect(() => {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {
        // Fallback caso a API falhe
        setUsers([]);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 py-12 bg-background safe-top safe-bottom">
      {/* Logo */}
      <div className="mb-8">
        <FloatingLogo size={56} />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">Moda KL Gestão</h1>
      <p className="text-muted-foreground text-sm mb-10">Quem está acessando?</p>

      {/* Cards de usuário */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 w-full max-w-sm"
      >
        {users.map((user) => (
          <motion.button
            key={user.id}
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/login/${user.id}`)}
            className="flex items-center gap-4 w-full p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow text-left"
          >
            {/* Avatar com iniciais */}
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">{getInitials(user.name)}</span>
            </div>
            <div>
              <span className="text-base font-semibold text-foreground">{user.name}</span>
              <p className="text-xs text-muted-foreground mt-0.5">Toque para entrar</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
