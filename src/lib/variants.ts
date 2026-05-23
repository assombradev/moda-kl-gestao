import type { Variant } from "@/components/products/ProductForm";

/**
 * Converte o array interno de Variant (estado do ProductForm) para o formato
 * esperado pelo endpoint PATCH /api/products/[id].
 *
 * Variantes novas criadas na UI recebem id com prefixo "tmp-" (não existem no banco).
 * O backend retorna 400 caso receba um id desconhecido, então essas variantes devem
 * ser enviadas sem o campo id, sinalizando criação.
 * Variantes existentes são enviadas com id real para atualização.
 */
export function prepareVariantsForApi(
  variants: Variant[]
): Array<{ id?: string; color_id: string; size: string; quantity: number }> {
  return variants.map((v) => {
    if (v.id.startsWith("tmp-")) {
      return { color_id: v.color_id, size: v.size, quantity: v.quantity };
    }
    return { id: v.id, color_id: v.color_id, size: v.size, quantity: v.quantity };
  });
}
