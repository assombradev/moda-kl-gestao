"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Tags } from "lucide-react";

/**
 * Página de gerenciamento de modelos cadastrados.
 * Permite editar nome inline, adicionar novos e deletar (com aviso se há produtos).
 */

interface Model {
  id: string;
  name: string;
  productCount?: number;
}

export default function ModelosPage() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch (err) {
      console.error("Erro ao carregar modelos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newModelName.trim()) return;
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newModelName.trim() }),
      });
      if (res.ok) {
        setNewModelName("");
        setShowAdd(false);
        fetchModels();
      }
    } catch (err) {
      console.error("Erro ao adicionar modelo:", err);
    }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchModels();
      }
    } catch (err) {
      console.error("Erro ao editar modelo:", err);
    }
  }

  async function handleDelete(model: Model) {
    if (model.productCount && model.productCount > 0) {
      const confirm = window.confirm(
        `O modelo "${model.name}" está sendo usado em ${model.productCount} produto(s). Deseja realmente deletar?`
      );
      if (!confirm) return;
    }
    try {
      await fetch(`/api/models/${model.id}`, { method: "DELETE" });
      fetchModels();
    } catch (err) {
      console.error("Erro ao deletar modelo:", err);
    }
  }

  return (
    <div
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Modelos</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="gap-1 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </div>

      {/* Adicionar novo modelo */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2"
        >
          <Input
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="Nome do modelo"
            className="h-11 flex-1"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="icon" onClick={handleAdd} className="h-11 w-11 rounded-xl">
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => { setShowAdd(false); setNewModelName(""); }}
            className="h-11 w-11 rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Lista de modelos */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhum modelo cadastrado"
          description="Adicione modelos para organizar seus produtos."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
            >
              {editingId === model.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleEdit(model.id)}
                  />
                  <button onClick={() => handleEdit(model.id)} className="p-2 text-primary">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-sm font-medium text-foreground">{model.name}</span>
                    {model.productCount !== undefined && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({model.productCount} produtos)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(model.id); setEditName(model.name); }}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
