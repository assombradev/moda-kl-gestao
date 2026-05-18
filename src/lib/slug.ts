import type { SupabaseClient } from '@supabase/supabase-js'
import { removeAccents } from './sku'

export function generateSlugBase(name: string): string {
  return removeAccents(name)
    .toLowerCase()
    // Remove emojis e caracteres fora de a-z, 0-9, espaço e hífen
    .replace(/[^a-z0-9\s-]/g, '')
    // Colapsa múltiplos espaços/hífens em um único hífen
    .replace(/[\s-]+/g, '-')
    // Remove hífens das pontas
    .replace(/^-+|-+$/g, '')
}

export async function generateUniqueSlug(
  name: string,
  supabaseClient: SupabaseClient,
  excludeId?: string
): Promise<string> {
  const base = generateSlugBase(name) || `produto-${Date.now()}`

  let candidate = base
  let suffix = 2

  while (true) {
    let query = supabaseClient
      .from('products')
      .select('id')
      .eq('slug', candidate)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query.maybeSingle()

    if (!data) return candidate

    candidate = `${base}-${suffix}`
    suffix++
  }
}
