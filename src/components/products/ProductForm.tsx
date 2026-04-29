"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Upload, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Formulário completo de criação/edição de produto.
 * Inclui upload de foto, seleção de categoria (radio buttons grandes),
 * modelo com autocomplete, custo com máscara R$, tabela de variantes.
 */

// Categorias fixas da loja (valores devem bater com o CHECK do banco)
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
  photoUrl?: string;
  photoFile?: File;
  variants: Variant[];
}

interface ProductFormProps {
  initialData?: ProductFormData;
  models?: string[]; // Lista de modelos para autocomplete
  colors?: { id: string; name: string; hex: string }[];
  sizes?: string[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onAddColor?: (name: string, hex: string) => Promise<{ id: string; name: string; hex: string } | null>;
  isLoading?: boolean;
}

export function ProductForm({
  initialData,
  models = [],
  colors = [],
  sizes = ["PP", "P", "M", "G", "GG", "Tamanho Único"],
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
      variants: [],
    }
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photoUrl || null
  );
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do mini color picker para "Outra cor"
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null); // variant.id que abriu o picker
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#E8839A");
  const [savingColor, setSavingColor] = useState(false);

  // Atualiza o form quando initialData carrega pela primeira vez (da API)
  const [initialized, setInitialized] = useState(!!initialData);
  useEffect(() => {
    if (initialData && !initialized) {
      setForm(initialData);
      if (initialData.photoUrl) setPhotoPreview(initialData.photoUrl);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  // Handler para upload de foto
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  // Máscara para valor em R$
  function handleCostChange(value: string) {
    // Remove tudo exceto números e vírgula
    const cleaned = value.replace(/[^\d,]/g, "");
    setForm((prev) => ({ ...prev, cost: cleaned }));
  }

  // Autocomplete de modelo
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

  // Adicionar variante
  function addVariant() {
    const newVariant: Variant = {
      id: crypto.randomUUID(),
      color_id: colors[0]?.id || "",
      color: colors[0]?.name || "",
      colorHex: colors[0]?.hex || "#E8839A",
      size: sizes[0] || "M",
      quantity: 1,
    };
    setForm((prev) => ({ ...prev, variants: [...prev.variants, newVariant] }));
  }

  // Remover variante
  function removeVariant(id: string) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  }

  // Atualizar variante
  function updateVariant(id: string, field: keyof Variant, value: string | number) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

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
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoPreview(null);
                  setForm((prev) => ({ ...prev, photoFile: undefined, photoUrl: undefined }));
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

      {/* Categoria - Radio buttons grandes */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, category: cat.id }))}
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
          onFocus={() => form.model && setShowSuggestions(modelSuggestions.length > 0)}
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

      {/* Custo com máscara R$ */}
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

      {/* Tabela de variantes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Variantes</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariant}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>

        {form.variants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 bg-muted/50 rounded-xl">
            Nenhuma variante adicionada
          </p>
        )}

        <div className="space-y-3">
          {form.variants.map((variant) => (
            <div
              key={variant.id}
              className="p-3 bg-muted/50 rounded-xl space-y-2"
            >
              {/* Linha 1: Cor + Tamanho + Remover */}
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                  style={{ background: variant.colorHex || "#ccc" }}
                />
                <select
                  value={variant.color_id}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowColorPicker(variant.id);
                      setNewColorName("");
                      setNewColorHex("#E8839A");
                      return;
                    }
                    const selectedColor = colors.find((c) => c.id === e.target.value);
                    if (selectedColor) {
                      updateVariant(variant.id, "color_id", selectedColor.id);
                      updateVariant(variant.id, "color", selectedColor.name);
                      updateVariant(variant.id, "colorHex", selectedColor.hex);
                    }
                  }}
                  className="flex-1 h-10 rounded-lg border border-border bg-card px-2 text-sm"
                >
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__new__">+ Outra cor...</option>
                </select>

                <select
                  value={variant.size}
                  onChange={(e) => updateVariant(variant.id, "size", e.target.value)}
                  className="w-20 h-10 rounded-lg border border-border bg-card px-2 text-sm text-center"
                >
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeVariant(variant.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Remover variante"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Linha 2: Quantidade */}
              <div className="flex items-center gap-2 pl-8">
                <span className="text-xs text-muted-foreground">Qtd:</span>
                <Input
                  type="number"
                  min={0}
                  value={variant.quantity}
                  onChange={(e) =>
                    updateVariant(variant.id, "quantity", parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-9 text-center text-sm"
                />
              </div>

              {/* Mini Color Picker — aparece ao selecionar "+ Outra cor..." */}
              {showColorPicker === variant.id && (
                <div className="p-3 bg-card border border-border rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-foreground">Nova cor</p>
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
                        const created = await onAddColor(newColorName.trim(), newColorHex);
                        setSavingColor(false);
                        if (created) {
                          updateVariant(variant.id, "color_id", created.id);
                          updateVariant(variant.id, "color", created.name);
                          updateVariant(variant.id, "colorHex", created.hex);
                          setShowColorPicker(null);
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
                      onClick={() => setShowColorPicker(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
