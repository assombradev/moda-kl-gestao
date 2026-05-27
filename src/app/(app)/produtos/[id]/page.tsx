"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm, type ProductFormData, type GalleryPhoto } from "@/components/products/ProductForm";
import { prepareVariantsForApi } from "@/lib/variants";
import { VariantRow } from "@/components/products/VariantRow";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Página de detalhe/edição de produto.
 * Mostra form pré-preenchido, lista de variantes com +/-, histórico e botão deletar.
 */

interface Movement {
  id: string;
  action: "create" | "increment" | "decrement" | "set" | "edit";
  qtyBefore: number;
  qtyAfter: number;
  variantLabel: string;
  date: string;
  userName: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any | null>(null);
  const [initialGallery, setInitialGallery] = useState<GalleryPhoto[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [colors, setColors] = useState<{ id: string; name: string; hex: string }[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    try {
      const [productRes, modelsRes, colorsRes, movementsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/models"),
        fetch("/api/colors"),
        fetch(`/api/movements?product_id=${productId}`),
      ]);

      if (productRes.ok) {
        const data = await productRes.json();
        const p = data.product;
        // Mapeia dados da API para o formato usado na página
        setProduct({
          ...p,
          // Mapear variantes para incluir color/colorHex do objeto aninhado
          variants: (p.variants || []).map((v: any) => ({
            ...v,
            color_id: v.color_id,
            color: v.colors?.name || '',
            colorHex: v.colors?.hex || '#ccc',
          })),
        });
        // Mapeia product_images para o formato GalleryPhoto usado pelo ProductForm
        setInitialGallery(
          (p.product_images || []).map((img: any): GalleryPhoto => ({
            id: img.id,
            colorId: img.color_id,
            file: null,
            previewUrl: img.url,
            isCover: img.is_cover,
            position: img.position,
          }))
        );
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models?.map((m: { name: string }) => m.name) || []);
      }
      if (colorsRes.ok) {
        const data = await colorsRes.json();
        setColors(data.colors || []);
      }
      if (movementsRes.ok) {
        const data = await movementsRes.json();
        // Mapeia o formato da API para o formato do componente
        const mapped = (data.movements || []).map((m: any) => ({
          id: m.id,
          action: m.action,
          qtyBefore: m.qty_before,
          qtyAfter: m.qty_after,
          variantLabel: `${m.variants?.colors?.name || 'Cor'} - ${m.variants?.size || '?'}`,
          date: m.created_at,
          userName: m.users?.name || 'Sistema',
        }));
        setMovements(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar produto:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Atualizar quantidade de variante via API
  async function updateVariantQty(variantId: string, delta: number) {
    try {
      await fetch(`/api/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: delta > 0 ? "increment" : "decrement", quantity: Math.abs(delta) }),
      });
      // Atualizar estado local
      setProduct((prev: any) => {
        if (!prev || !prev.variants) return prev;
        return {
          ...prev,
          variants: prev.variants.map((v: any) =>
            v.id === variantId
              ? { ...v, quantity: Math.max(0, v.quantity + delta) }
              : v
          ),
        };
      });
      // Recarregar histórico para mostrar a nova movimentação
      const movRes = await fetch(`/api/movements?product_id=${productId}`);
      if (movRes.ok) {
        const data = await movRes.json();
        const mapped = (data.movements || []).map((m: any) => ({
          id: m.id,
          action: m.action,
          qtyBefore: m.qty_before,
          qtyAfter: m.qty_after,
          variantLabel: `${m.variants?.colors?.name || 'Cor'} - ${m.variants?.size || '?'}`,
          date: m.created_at,
          userName: m.users?.name || 'Sistema',
        }));
        setMovements(mapped);
      }
    } catch (err) {
      console.error("Erro ao atualizar quantidade:", err);
    }
  }

  // Salvar edição do produto
  async function handleSubmit(data: ProductFormData) {
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (data.name) updates.name = data.name;
      if (data.category) updates.category = data.category;
      if (data.model) updates.model = data.model;
      if (data.cost) updates.cost_brl = parseFloat(data.cost.replace(',', '.'));
      updates.price_brl = data.price ? parseFloat(data.price.replace(',', '.')) : null;
      updates.description = data.description || null;
      const parsedOrder = parseInt(data.displayOrder, 10);
      updates.display_order = Number.isFinite(parsedOrder) ? parsedOrder : 0;
      updates.variants = prepareVariantsForApi(data.variants);
      updates.is_published = data.isPublished ?? false;

      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const body = await res.json();

      if (res.ok) {
        const p = body.product;
        setProduct({
          ...p,
          variants: (p.variants || []).map((v: any) => ({
            ...v,
            color_id: v.color_id,
            color: v.colors?.name || '',
            colorHex: v.colors?.hex || '#ccc',
          })),
        });
        setShowSuccess(true);
      } else {
        setErrorMessage(body.error || "Erro desconhecido ao salvar.");
      }
    } catch {
      setErrorMessage("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // Deletar produto
  async function handleDelete() {
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/produtos");
      } else {
        setErrorMessage("Não foi possível excluir o produto. Tente novamente.");
      }
    } catch {
      setErrorMessage("Erro de conexão. Tente novamente.");
    }
  }

  if (loading) return <LoadingScreen />;
  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Produto não encontrado</p>
      </div>
    );
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
          <h1 className="text-xl font-bold text-foreground">Editar produto</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Histórico */}
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border hover:bg-muted transition-colors">
              <History className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Histórico de movimentações</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full mt-4">
                {movements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação registrada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {movements.map((mov) => {
                      // Configuração visual por tipo de ação
                      const config = {
                        create: { label: "Criação", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
                        increment: { label: "Entrada", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                        decrement: { label: "Saída", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
                        set: { label: "Ajuste", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
                        edit: { label: "Edição", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
                      }[mov.action] || { label: mov.action, className: "bg-muted text-muted-foreground" };

                      return (
                        <div
                          key={mov.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-xl gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {mov.variantLabel}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {mov.qtyBefore} → {mov.qtyAfter} · {mov.userName} · {new Date(mov.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${config.className}`}>
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Deletar */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Variantes com ajuste rápido de quantidade */}
      {product.variants && product.variants.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Variantes em estoque</h3>
          </div>
          <div className="px-2">
            {product.variants.map((variant: any) => (
              <VariantRow
                key={variant.id}
                color={variant.color}
                colorHex={variant.colorHex}
                size={variant.size}
                quantity={variant.quantity}
                onIncrement={() => updateVariantQty(variant.id, 1)}
                onDecrement={() => updateVariantQty(variant.id, -1)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Formulário de edição */}
      <ProductForm
        key={product.updated_at}
        initialData={{
          name: product.name || '',
          category: product.category || '',
          model: product.model || '',
          cost: product.cost_brl ? String(product.cost_brl).replace('.', ',') : '',
          price: product.price_brl != null ? String(product.price_brl).replace('.', ',') : '',
          description: product.description || '',
          displayOrder: product.display_order != null ? String(product.display_order) : '0',
          photoUrl: product.photo_url || undefined,
          variants: product.variants || [],
          isPublished: product.is_published ?? false,
          publishedAt: product.published_at ?? null,
        }}
        initialGallery={initialGallery}
        productId={product.id}
        onGalleryError={(msg) => setErrorMessage(msg)}
        models={models}
        colors={colors}
        onSubmit={handleSubmit}
        isLoading={saving}
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

      {/* Modal de confirmação de delete */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Deletar produto?"
        message="Essa ação não pode ser desfeita. Todas as variantes e histórico serão removidos."
        actionLabel="Sim, deletar"
        onAction={handleDelete}
      />

      {/* Modal de sucesso */}
      <ConfirmModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Alterações salvas!"
        message="O produto foi atualizado com sucesso."
      />

      {/* Modal de erro */}
      <ConfirmModal
        open={errorMessage !== null}
        onClose={() => setErrorMessage(null)}
        title="Erro ao salvar"
        message={errorMessage ?? undefined}
        isError
      />
    </div>
  );
}
