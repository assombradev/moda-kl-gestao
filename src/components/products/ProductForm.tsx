"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Upload, X, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion } from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VariantColorGroup } from "@/components/products/VariantColorGroup";
import { SIZES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "Biquíni", label: "Biquíni", emoji: "👙" },
  { id: "Saída", label: "Saída", emoji: "👗" },
  { id: "Body", label: "Body", emoji: "🩱" },
  { id: "Top", label: "Top", emoji: "✨" },
  { id: "Calcinha", label: "Calcinha", emoji: "💍" },
];

export interface Variant {
  id: string;
  color_id: string;
  color: string;
  colorHex: string;
  size: string;
  quantity: number;
}

export interface ProductFormData {
  name: string;
  category: string;
  model: string;
  cost: string;
  price: string;
  description: string;
  displayOrder: string;
  photoUrl?: string;
  photoFile?: File;
  variants: Variant[];
}

interface ColorProp {
  id: string;
  name: string;
  hex: string;
  is_gradient?: boolean;
  gradient_hex_2?: string | null;
}

interface EmptyColor {
  colorId: string;
  colorName: string;
  colorHex: string;
  isGradient: boolean;
  gradientHex2: string | null;
}

interface ColorGroup {
  colorId: string;
  colorName: string;
  colorHex: string;
  isGradient: boolean;
  gradientHex2: string | null;
  sizes: Array<{ size: string; quantity: number | null; variantId: string | null }>;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  models?: string[];
  colors?: ColorProp[];
  sizes?: string[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onAddColor?: (
    name: string,
    hex: string
  ) => Promise<{ id: string; name: string; hex: string } | null>;
  isLoading?: boolean;
}

// Converte array plano de Variant em grupos por cor para renderização.
// Função pura, sem side effects.
function groupVariantsByColor(
  variants: Variant[],
  emptyColors: EmptyColor[],
  allColors: ColorProp[],
  allSizes: string[]
): ColorGroup[] {
  const groups = new Map<string, ColorGroup>();

  for (const v of variants) {
    if (!groups.has(v.color_id)) {
      const full = allColors.find((c) => c.id === v.color_id);
      groups.set(v.color_id, {
        colorId: v.color_id,
        colorName: v.color,
        colorHex: v.colorHex,
        isGradient: full?.is_gradient ?? false,
        gradientHex2: full?.gradient_hex_2 ?? null,
        sizes: allSizes.map((s) => ({ size: s, quantity: null, variantId: null })),
      });
    }
    const group = groups.get(v.color_id)!;
    const idx = group.sizes.findIndex((s) => s.size === v.size);
    if (idx >= 0) {
      group.sizes[idx] = { size: v.size, quantity: v.quantity, variantId: v.id };
    }
  }

  for (const ec of emptyColors) {
    if (!groups.has(ec.colorId)) {
      groups.set(ec.colorId, {
        colorId: ec.colorId,
        colorName: ec.colorName,
        colorHex: ec.colorHex,
        isGradient: ec.isGradient,
        gradientHex2: ec.gradientHex2,
        sizes: allSizes.map((s) => ({ size: s, quantity: null, variantId: null })),
      });
    }
  }

  return Array.from(groups.values());
}

export function ProductForm({
  initialData,
  models = [],
  colors = [],
  sizes = [...SIZES],
  onSubmit,
  onAddColor,
  isLoading = false,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(
    initialData || {
      name: "",
      category: "",
      model: "",
      cost: "",
      price: "",
      description: "",
      displayOrder: "0",
      variants: [],
    }
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photoUrl || null
  );
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cores adicionadas via popover que ainda não têm nenhuma variant criada
  const [addedEmptyColors, setAddedEmptyColors] = useState<EmptyColor[]>([]);

  // Estado do popover de adicionar cor
  const [addColorOpen, setAddColorOpen] = useState(false);
  const [showCreateColor, setShowCreateColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#E8839A");
  const [savingColor, setSavingColor] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [initialized, setInitialized] = useState(!!initialData);
  useEffect(() => {
    if (initialData && !initialized) {
      setForm(initialData);
      if (initialData.photoUrl) setPhotoPreview(initialData.photoUrl);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  function handleCostChange(value: string) {
    const cleaned = value.replace(/[^\d,]/g, "");
    setForm((prev) => ({ ...prev, cost: cleaned }));
  }

  function handlePriceChange(value: string) {
    const cleaned = value.replace(/[^\d,]/g, "");
    setForm((prev) => ({ ...prev, price: cleaned }));
  }

  function handleDisplayOrderChange(value: string) {
    const cleaned = value.replace(/[^\d]/g, "");
    setForm((prev) => ({ ...prev, displayOrder: cleaned }));
  }

  function handleModelChange(value: string) {
    setForm((prev) => ({ ...prev, model: value }));
    if (value.length > 0) {
      const filtered = models.filter((m) =>
        m.toLowerCase().includes(value.toLowerCase())
      );
      setModelSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  // --- Handlers de variantes ---

  function handleSizeQuantityChange(
    colorId: string,
    colorName: string,
    colorHex: string,
    size: string,
    newQty: number | null
  ) {
    setSubmitError(null);
    const currentVariants = form.variants;
    const existingIdx = currentVariants.findIndex(
      (v) => v.color_id === colorId && v.size === size
    );

    // Caso de remoção (input limpo): trata fora do updater para poder
    // chamar setAddedEmptyColors logo depois com dados da variant removida
    if (existingIdx >= 0 && newQty === null) {
      const removedVariant = currentVariants[existingIdx];
      const remainingForColor = currentVariants.filter(
        (v) => v.color_id === colorId && v.size !== size
      );

      setForm((prev) => ({
        ...prev,
        variants: prev.variants.filter(
          (v) => !(v.color_id === colorId && v.size === size)
        ),
      }));

      // Se a cor ficou sem variants, mantém o grupo visível no Accordion
      if (remainingForColor.length === 0) {
        const full = colors.find((c) => c.id === colorId);
        setAddedEmptyColors((prev) => {
          if (prev.some((c) => c.colorId === colorId)) return prev;
          return [
            ...prev,
            {
              colorId,
              colorName: removedVariant.color,
              colorHex: removedVariant.colorHex,
              isGradient: full?.is_gradient ?? false,
              gradientHex2: full?.gradient_hex_2 ?? null,
            },
          ];
        });
      }
      return;
    }

    // Atualização de quantidade ou criação de variant nova
    setForm((prev) => {
      const variants = prev.variants;
      const idx = variants.findIndex(
        (v) => v.color_id === colorId && v.size === size
      );

      if (idx >= 0) {
        return {
          ...prev,
          variants: variants.map((v, i) =>
            i === idx ? { ...v, quantity: newQty! } : v
          ),
        };
      }

      // Variant não existe: criar apenas se qty > 0
      if (newQty !== null && newQty > 0) {
        const newVariant: Variant = {
          id: `tmp-${crypto.randomUUID()}`,
          color_id: colorId,
          color: colorName,
          colorHex,
          size,
          quantity: newQty,
        };
        return { ...prev, variants: [...variants, newVariant] };
      }

      return prev;
    });

    // Quando a primeira variant de uma cor é criada, remove de addedEmptyColors
    // (a cor passa a aparecer via form.variants na próxima renderização)
    if (newQty !== null && newQty > 0) {
      setAddedEmptyColors((prev) => prev.filter((c) => c.colorId !== colorId));
    }
  }

  function handleSizeDelete(colorId: string, size: string) {
    setSubmitError(null);
    const removedVariant = form.variants.find(
      (v) => v.color_id === colorId && v.size === size
    );
    const remainingForColor = form.variants.filter(
      (v) => v.color_id === colorId && v.size !== size
    );

    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter(
        (v) => !(v.color_id === colorId && v.size === size)
      ),
    }));

    // Se a cor ficou sem variants, mantém o grupo visível no Accordion
    if (removedVariant && remainingForColor.length === 0) {
      const full = colors.find((c) => c.id === colorId);
      setAddedEmptyColors((prev) => {
        if (prev.some((c) => c.colorId === colorId)) return prev;
        return [
          ...prev,
          {
            colorId,
            colorName: removedVariant.color,
            colorHex: removedVariant.colorHex,
            isGradient: full?.is_gradient ?? false,
            gradientHex2: full?.gradient_hex_2 ?? null,
          },
        ];
      });
    }
  }

  function handleColorRemove(colorId: string) {
    setSubmitError(null);
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.color_id !== colorId),
    }));
    setAddedEmptyColors((prev) => prev.filter((c) => c.colorId !== colorId));
  }

  function handleColorAdd(
    colorId: string,
    colorName: string,
    colorHex: string,
    isGradient: boolean,
    gradientHex2: string | null
  ) {
    setSubmitError(null);
    const alreadyExists =
      form.variants.some((v) => v.color_id === colorId) ||
      addedEmptyColors.some((c) => c.colorId === colorId);

    if (!alreadyExists) {
      setAddedEmptyColors((prev) => [
        ...prev,
        { colorId, colorName, colorHex, isGradient, gradientHex2 },
      ]);
    }
    setAddColorOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const seen = new Set<string>();
    for (const v of form.variants) {
      const key = `${v.color_id}::${v.size}`;
      if (seen.has(key)) {
        setSubmitError(
          `Variante duplicada: ${v.color} + ${v.size}. Cada combinação de cor + tamanho só pode aparecer uma vez.`
        );
        return;
      }
      seen.add(key);
    }

    setSubmitError(null);
    await onSubmit(form);
  }

  // Agrupa variantes por cor para renderização
  const currentGroups = groupVariantsByColor(
    form.variants,
    addedEmptyColors,
    colors,
    sizes
  );

  // Cores disponíveis no popover: exclui as que já estão no produto
  const existingColorIds = new Set(currentGroups.map((g) => g.colorId));
  const availableColors = colors.filter((c) => !existingColorIds.has(c.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {/* Upload de foto */}
      <div className="space-y-2">
        <Label>Foto do produto</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative aspect-video rounded-2xl border-2 border-dashed border-border",
            "flex items-center justify-center cursor-pointer overflow-hidden",
            "hover:border-primary/50 transition-colors bg-muted/50"
          )}
        >
          {photoPreview ? (
            <>
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoPreview(null);
                  setForm((prev) => ({
                    ...prev,
                    photoFile: undefined,
                    photoUrl: undefined,
                  }));
                }}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <span className="text-sm">Toque para adicionar foto</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>

      {/* Nome do produto */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do produto</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Biquíni Tropical"
          required
          className="h-12 text-base"
        />
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, category: cat.id }))
              }
              className={cn(
                "flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all min-h-[72px]",
                form.category === cat.id
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modelo com autocomplete */}
      <div className="space-y-2 relative">
        <Label htmlFor="model">Modelo</Label>
        <Input
          id="model"
          value={form.model}
          onChange={(e) => handleModelChange(e.target.value)}
          onFocus={() =>
            form.model && setShowSuggestions(modelSuggestions.length > 0)
          }
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Ex: Cortininha, Ripple..."
          className="h-12 text-base"
        />
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {modelSuggestions.map((m) => (
              <button
                key={m}
                type="button"
                onMouseDown={() => {
                  setForm((prev) => ({ ...prev, model: m }));
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custo */}
      <div className="space-y-2">
        <Label htmlFor="cost">Custo (R$)</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
            R$
          </span>
          <Input
            id="cost"
            value={form.cost}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="0,00"
            className="h-12 text-base pl-11"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Variantes agrupadas por cor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Variantes</Label>
          <Popover
            open={addColorOpen}
            onOpenChange={(open) => {
              setAddColorOpen(open);
              if (!open) setShowCreateColor(false);
            }}
          >
            <PopoverTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1"
              )}
            >
              <Plus className="w-4 h-4" />
              Adicionar cor
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-64 p-0">
              {!showCreateColor ? (
                // Lista de cores disponíveis
                <div className="flex flex-col">
                  {availableColors.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-4 text-center">
                      Todas as cores já foram adicionadas.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto p-1">
                      {availableColors.map((c) => {
                        const swatchStyle =
                          c.is_gradient && c.gradient_hex_2
                            ? {
                                background: `linear-gradient(135deg, ${c.hex}, ${c.gradient_hex_2})`,
                              }
                            : { background: c.hex };
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              handleColorAdd(
                                c.id,
                                c.name,
                                c.hex,
                                c.is_gradient ?? false,
                                c.gradient_hex_2 ?? null
                              )
                            }
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-left"
                          >
                            <div
                              className="w-5 h-5 rounded-full border border-border shrink-0"
                              style={swatchStyle}
                            />
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="border-t border-border p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewColorName("");
                        setNewColorHex("#E8839A");
                        setShowCreateColor(true);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      Criar cor nova
                    </button>
                  </div>
                </div>
              ) : (
                // Sub-view: criar cor nova dentro do mesmo popover
                <div className="p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    Nova cor
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="Nome da cor (ex: Coral)"
                      className="flex-1 h-10 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newColorName.trim() || savingColor}
                      onClick={async () => {
                        if (!onAddColor) return;
                        setSavingColor(true);
                        const created = await onAddColor(
                          newColorName.trim(),
                          newColorHex
                        );
                        setSavingColor(false);
                        if (created) {
                          handleColorAdd(
                            created.id,
                            created.name,
                            created.hex,
                            false,
                            null
                          );
                          setShowCreateColor(false);
                        }
                      }}
                      className="gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {savingColor ? "Salvando..." : "Salvar cor"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateColor(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {currentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 bg-muted/50 rounded-xl">
            Nenhuma cor adicionada ainda. Use o botão acima para começar.
          </p>
        ) : (
          <Accordion className="space-y-2">
            {currentGroups.map((group) => (
              <VariantColorGroup
                key={group.colorId}
                colorId={group.colorId}
                colorName={group.colorName}
                colorHex={group.colorHex}
                isGradient={group.isGradient}
                gradientHex2={group.gradientHex2}
                sizes={group.sizes}
                onSizeQuantityChange={(size, newQty) =>
                  handleSizeQuantityChange(
                    group.colorId,
                    group.colorName,
                    group.colorHex,
                    size,
                    newQty
                  )
                }
                onSizeDelete={(size) => handleSizeDelete(group.colorId, size)}
                onColorRemove={() => handleColorRemove(group.colorId)}
              />
            ))}
          </Accordion>
        )}
      </div>

      {/* Dados do catálogo */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Dados do catálogo
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Informações que aparecem para a cliente no catálogo público.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço de venda</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
              R$
            </span>
            <Input
              id="price"
              value={form.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0,00"
              className="h-12 text-base pl-11"
              inputMode="decimal"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor que aparece para a cliente no catálogo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={5}
            placeholder="Caimento, tecido, modelagem..."
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground">
            Texto que aparece para a cliente no catálogo. Descreva caimento,
            tecido, modelagem.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-order">Ordem de exibição</Label>
          <Input
            id="display-order"
            value={form.displayOrder}
            onChange={(e) => handleDisplayOrderChange(e.target.value)}
            placeholder="0"
            className="h-12 text-base"
            inputMode="numeric"
            min="0"
          />
          <p className="text-xs text-muted-foreground">
            Quanto maior o número, mais alto o produto aparece no catálogo. Use
            0 para ordem padrão.
          </p>
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive" className="border-destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Botão de submit */}
      <Button
        type="submit"
        disabled={isLoading || !form.name || !form.category}
        className="w-full h-14 text-base font-semibold rounded-xl"
      >
        {isLoading ? "Salvando..." : initialData ? "Salvar alterações" : "Cadastrar produto"}
      </Button>
    </form>
  );
}
