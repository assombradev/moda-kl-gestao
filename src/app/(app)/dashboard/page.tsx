"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, Layers, Plus } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard principal do app.
 * Mostra saudação, 3 cards de estatísticas, 5 produtos recentes e FAB.
 */
interface DashboardStats {
  totalPieces: number;
  totalModels: number;
  lowStockAlerts: number;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Buscar todos os dados em paralelo para evitar waterfall
        const [userRes, statsRes, productsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/dashboard/stats"),
          fetch("/api/products?limit=5&sort=recent"),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUserName(userData.name || "");
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const mapped = (productsData.products || []).map((p: any) => {
            const variants = p.variants || [];
            return {
              id: p.id,
              name: p.name,
              photoUrl: p.photo_url,
              category: p.category,
              model: p.model,
              skuBase: `${p.sku_prefix}${String(p.sequential_number).padStart(3, '0')}`,
              totalPieces: variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0),
              variants: variants.map((v: any) => ({
                color: v.colors?.name || '',
                colorHex: v.colors?.hex || '#ccc',
                size: v.size,
                quantity: v.quantity || 0,
              })),
            };
          });
          setRecentProducts(mapped);
        }
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const statCards = [
    {
      icon: Package,
      label: "Total de peças",
      value: stats?.totalPieces ?? 0,
      color: "text-primary",
      bg: "bg-primary/10",
      href: undefined as string | undefined,
    },
    {
      icon: Layers,
      label: "Modelos cadastrados",
      value: stats?.totalModels ?? 0,
      color: "text-accent",
      bg: "bg-accent/10",
      href: undefined as string | undefined,
    },
    {
      icon: AlertTriangle,
      label: "Estoque baixo",
      value: stats?.lowStockAlerts ?? 0,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      badge: true,
      href: "/produtos?statuses=baixo",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {userName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumo do seu estoque
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((card) => {
          const Wrapper = card.href ? "a" : "div";
          return (
            <Wrapper
              key={card.label}
              {...(card.href ? { href: card.href } : {})}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">
                    {loading ? "..." : card.value}
                  </span>
                  {card.badge && !loading && card.value > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      !
                    </Badge>
                  )}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Produtos recentes */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Produtos recentes
        </h2>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : recentProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Comece adicionando seu primeiro produto ao estoque."
          />
        ) : (
          <div className="grid gap-4">
            {recentProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>

      {/* FAB - Botão flutuante para novo produto */}
      <button
        onClick={() => router.push("/produtos/novo")}
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 px-5 py-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
        <span className="font-semibold text-sm">Novo produto</span>
      </button>
    </div>
  );
}
