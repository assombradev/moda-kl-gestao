"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Página de listagem de produtos com busca e filtros.
 * Filtros em sheet lateral: categoria (multi-select) e status.
 */

const CATEGORIES = [
  { id: "Biquíni", label: "Biquíni" },
  { id: "Saída", label: "Saída" },
  { id: "Body", label: "Body" },
  { id: "Top", label: "Top" },
  { id: "Calcinha", label: "Calcinha" },
];

const STATUSES = [
  { id: "em_estoque", label: "Em estoque" },
  { id: "baixo", label: "Estoque baixo" },
  { id: "esgotado", label: "Esgotado" },
];

interface VariantInfo {
  color: string;
  colorHex: string;
  size: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  photoUrl?: string;
  category: string;
  model: string;
  skuBase: string;
  totalPieces: number;
  variants: VariantInfo[];
}

export default function ProdutosPage() {
  const urlParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Inicializa filtros a partir da URL (ex: /produtos?statuses=baixo)
  useEffect(() => {
    const statusesParam = urlParams.get("statuses");
    if (statusesParam) {
      setSelectedStatuses(statusesParam.split(",").filter(Boolean));
      setShowFilters(true);
    }
  }, [urlParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
      if (selectedStatuses.length) params.set("statuses", selectedStatuses.join(","));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Mapeia campos da API (snake_case) para o formato do componente (camelCase)
        const mapped = (data.products || []).map((p: any) => {
          const variants = p.variants || [];
          return {
            id: p.id,
            name: p.name,
            photoUrl: p.photo_url,
            category: p.category,
            model: p.model,
            skuBase: `${p.sku_prefix}${String(p.sequential_number).padStart(3, '0')}`,
            totalPieces: variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0),
            // Todas as variantes com cor, tamanho e quantidade
            variants: variants.map((v: any) => ({
              color: v.colors?.name || '',
              colorHex: v.colors?.hex || '#ccc',
              size: v.size,
              quantity: v.quantity || 0,
            })),
          };
        });
        setProducts(mapped);
      }
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategories, selectedStatuses]);

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 300); // Debounce
    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleStatus(id: string) {
    setSelectedStatuses((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const hasActiveFilters = selectedCategories.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="space-y-4">
      {/* Barra de busca e filtro */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="pl-10 h-12 text-base rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-12 w-12 rounded-xl relative",
            hasActiveFilters && "border-primary"
          )}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          )}
        </Button>
      </div>

      {/* Painel de filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-card rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Filtros</h3>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      setSelectedStatuses([]);
                    }}
                    className="text-xs text-primary font-medium"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Categorias */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        selectedCategories.includes(cat.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => toggleStatus(status.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        selectedStatuses.includes(status.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de produtos */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          description={search ? "Tente buscar por outro termo." : "Comece cadastrando seu primeiro produto."}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
