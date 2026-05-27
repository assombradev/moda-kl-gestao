// Validador compartilhado entre frontend (ProductForm) e backend (PATCH /api/products/[id]).
// Pura função, sem side effects, sem imports de framework.

export type PublishCheckInput = {
  priceBrl: number | null | undefined;
  variants: Array<{ quantity: number }>;
  galleryCount: number;
};

export type PublishCheckResult = {
  canPublish: boolean;
  missing: string[];
};

export function validatePublish(input: PublishCheckInput): PublishCheckResult {
  const missing: string[] = [];

  if (!input.priceBrl || input.priceBrl <= 0) {
    missing.push("preço de venda");
  }

  const hasStock = input.variants.some((v) => v.quantity > 0);
  if (!hasStock) {
    missing.push("ao menos 1 variante com estoque");
  }

  if (input.galleryCount === 0) {
    missing.push("ao menos 1 foto na galeria");
  }

  return { canPublish: missing.length === 0, missing };
}
