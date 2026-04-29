"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

/**
 * Modal animado de confirmação com check verde (SVG path drawing).
 * Usado após ações como cadastrar produto ou deletar.
 */
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function ConfirmModal({
  open,
  onClose,
  title = "Sucesso!",
  message,
  children,
  actionLabel = "OK",
  onAction,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl p-8 shadow-xl text-center space-y-4"
          >
            {/* Ícone animado de check */}
            <div className="flex justify-center">
              <svg
                className="w-16 h-16"
                viewBox="0 0 64 64"
                fill="none"
              >
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#22C55E"
                  strokeWidth="4"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.path
                  d="M20 32L28 40L44 24"
                  stroke="#22C55E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-foreground">{title}</h2>

            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}

            {children}

            <Button
              onClick={onAction || onClose}
              className="w-full h-12 text-base font-semibold rounded-xl mt-4"
            >
              {actionLabel}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
