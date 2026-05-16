"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm, type ProductFormData } from "@/components/products/ProductForm";
import { ConfirmModal } from "@/components/common/ConfirmModal";

/**
 * Página de cadastro de novo produto.
 * Usa o ProductForm e mostra ConfirmModal com resumo dos SKUs ao finalizar.
 */
export default function NovoProdutoPage() {
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [colors, setColors] = useState<{ id: string; name: string; hex: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSKUs, setCreatedSKUs] = useState<string[]>([]);

  useEffect(() => {
    // Carregar modelos e cores disponíveis
    async function loadData() {
      try {
        const [modelsRes, colorsRes] = await Promise.all([
          fetch("/api/models"),
          fetch("/api/colors"),
        ]);
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          setModels(data.models?.map((m: { name: string }) => m.name) || []);
        }
        if (colorsRes.ok) {
          const data = await colorsRes.json();
          setColors(data.colors || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(data: ProductFormData) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("category", data.category);
      formData.append("model", data.model);
      formData.append("cost", data.cost);
      formData.append("price", data.price);
      formData.append("description", data.description);
      formData.append("display_order", data.displayOrder);
      formData.append("variants", JSON.stringify(data.variants));
      if (data.photoFile) {
        formData.append("photo", data.photoFile);
      }

      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setCreatedSKUs(result.skus || []);
        setShowSuccess(true);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar produto");
      }
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      alert("Erro de conexão");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Header da página */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Novo produto</h1>
      </div>

      {/* Formulário */}
      <ProductForm
        models={models}
        colors={colors}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onAddColor={async (name, hex) => {
          try {
            const res = await fetch("/api/colors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, hex }),
            });
            if (res.ok) {
              const data = await res.json();
              const newColor = { id: data.color.id, name: data.color.name, hex: data.color.hex };
              setColors((prev) => [...prev, newColor]);
              return newColor;
            }
            return null;
          } catch {
            return null;
          }
        }}
      />

      {/* Modal de sucesso com SKUs */}
      <ConfirmModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          router.push("/produtos");
        }}
        title="Produto cadastrado!"
        message="O produto foi adicionado ao estoque com sucesso."
        actionLabel="Ver produtos"
        onAction={() => {
          setShowSuccess(false);
          router.push("/produtos");
        }}
      >
        {createdSKUs.length > 0 && (
          <div className="mt-3 p-3 bg-muted rounded-xl text-left">
            <p className="text-xs font-semibold text-muted-foreground mb-2">SKUs criados:</p>
            <div className="space-y-1">
              {createdSKUs.map((sku) => (
                <p key={sku} className="text-xs font-mono text-foreground">{sku}</p>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
