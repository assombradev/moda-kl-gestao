"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import { Palette } from "lucide-react";
import { HexColorPicker } from "react-colorful";

/**
 * Página de gerenciamento de cores.
 * Lista visual com chips coloridos, adicionar nova (nome + color picker),
 * deletar (bloqueado para cores padrão).
 */

interface Color {
  id: string;
  name: string;
  hex: string;
  isDefault?: boolean;
}

export default function CoresPage() {
  const router = useRouter();
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#E8839A");

  useEffect(() => {
    fetchColors();
  }, []);

  async function fetchColors() {
    try {
      const res = await fetch("/api/colors");
      if (res.ok) {
        const data = await res.json();
        setColors(data.colors || []);
      }
    } catch (err) {
      console.error("Erro ao carregar cores:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), hex: newHex }),
      });
      if (res.ok) {
        setNewName("");
        setNewHex("#E8839A");
        setShowAdd(false);
        fetchColors();
      }
    } catch (err) {
      console.error("Erro ao adicionar cor:", err);
    }
  }

  async function handleDelete(color: Color) {
    if (color.isDefault) {
      alert("Cores padrão não podem ser removidas.");
      return;
    }
    const confirm = window.confirm(`Deseja deletar a cor "${color.name}"?`);
    if (!confirm) return;
    try {
      await fetch(`/api/colors/${color.id}`, { method: "DELETE" });
      fetchColors();
    } catch (err) {
      console.error("Erro ao deletar cor:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Cores</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="gap-1 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </div>

      {/* Adicionar nova cor */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-card rounded-2xl border border-border p-4 space-y-4"
        >
          <div className="space-y-2">
            <Label>Nome da cor</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Rosa Claro"
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Selecione a cor</Label>
            <div className="flex items-start gap-4">
              <HexColorPicker color={newHex} onChange={setNewHex} style={{ width: "100%", height: 150 }} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-8 h-8 rounded-full border border-border"
                style={{ backgroundColor: newHex }}
              />
              <span className="text-sm text-muted-foreground font-mono">{newHex}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} className="flex-1 h-11 rounded-xl gap-1">
              <Check className="w-4 h-4" />
              Adicionar
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="h-11 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Lista de cores */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : colors.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="Nenhuma cor cadastrada"
          description="Adicione cores para usar nas variantes dos produtos."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {colors.map((color) => (
            <div
              key={color.id}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">{color.name}</span>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
              </div>

              {color.isDefault ? (
                <span className="text-xs text-muted-foreground">Padrão</span>
              ) : (
                <button
                  onClick={() => handleDelete(color)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
