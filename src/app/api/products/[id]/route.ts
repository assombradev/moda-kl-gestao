// Rotas de produto individual - GET, PATCH, DELETE
// GET: produto com variantes e cores
// PATCH: atualiza campos do produto e, opcionalmente, o snapshot completo de variantes
// DELETE: exclusão permanente (hard delete)

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { generateUniqueSlug } from '@/lib/slug'

type RouteContext = { params: Promise<{ id: string }> }

type VariantSnapshot = {
  id?: string
  color_id: string
  size: string
  quantity: number
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth()

    const { id } = await context.params

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        variants (
          id,
          color_id,
          size,
          quantity,
          created_at,
          updated_at,
          colors:color_id (
            id,
            name,
            hex,
            is_gradient,
            gradient_hex_2
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth()

    const { id } = await context.params
    const updates = await request.json()

    // --- Campos escalares do produto ---
    const allowedFields = ['name', 'category', 'model', 'cost_brl', 'photo_url', 'price_brl', 'description', 'display_order']
    const filteredUpdates: Record<string, unknown> = {}

    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    // Regera o slug sempre que o nome for alterado
    if ('name' in updates && updates.name) {
      filteredUpdates.slug = await generateUniqueSlug(updates.name, supabase, id)
    }

    const hasScalarUpdates = Object.keys(filteredUpdates).length > 0
    const hasVariants = 'variants' in updates

    if (!hasScalarUpdates && !hasVariants) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      )
    }

    // --- Atualiza campos escalares do produto ---
    if (hasScalarUpdates) {
      filteredUpdates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('products')
        .update(filteredUpdates)
        .eq('id', id)

      if (error) {
        console.error('Erro ao atualizar produto:', error)
        return NextResponse.json(
          { error: 'Erro ao atualizar produto' },
          { status: 500 }
        )
      }
    }

    // --- Processa snapshot de variantes ---
    if (hasVariants) {
      const snapshot: VariantSnapshot[] = updates.variants

      // Array vazio: descarta silenciosamente por segurança
      if (!Array.isArray(snapshot) || snapshot.length === 0) {
        console.warn(
          `[PATCH /api/products/${id}] Campo "variants" recebido como array vazio — descartado por segurança para evitar perda acidental de dados.`
        )
      } else {
        // Validação de campos obrigatórios e tipos
        for (const item of snapshot) {
          if (!item.color_id || !item.size || item.quantity === undefined || item.quantity === null) {
            return NextResponse.json(
              { error: 'Cada variante precisa ter color_id, size e quantity.' },
              { status: 400 }
            )
          }
          if (!Number.isInteger(item.quantity) || item.quantity < 0) {
            return NextResponse.json(
              { error: 'O campo quantity precisa ser um inteiro maior ou igual a zero.' },
              { status: 400 }
            )
          }
        }

        // Validação de duplicatas (color_id + size) dentro do snapshot
        const seen = new Set<string>()
        for (const item of snapshot) {
          const key = `${item.color_id}::${item.size}`
          if (seen.has(key)) {
            return NextResponse.json(
              { error: 'Variantes duplicadas detectadas (cor + tamanho).' },
              { status: 400 }
            )
          }
          seen.add(key)
        }

        // Busca estado atual das variantes do produto no banco
        const { data: currentVariants, error: fetchError } = await supabase
          .from('variants')
          .select('id, color_id, size, quantity')
          .eq('product_id', id)

        if (fetchError) {
          console.error('Erro ao buscar variantes atuais:', fetchError)
          return NextResponse.json(
            { error: 'Erro ao buscar variantes atuais do produto.' },
            { status: 500 }
          )
        }

        const dbVariants = currentVariants ?? []
        const dbById = new Map(dbVariants.map((v) => [v.id, v]))
        const snapshotIds = new Set(snapshot.filter((v) => v.id).map((v) => v.id as string))

        // IDs que existem no banco mas sumiram do snapshot → deletar
        const toDelete = dbVariants.filter((v) => !snapshotIds.has(v.id)).map((v) => v.id)

        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('variants')
            .delete()
            .in('id', toDelete)

          if (deleteError) {
            console.error('Erro ao deletar variantes removidas:', deleteError)
            return NextResponse.json(
              { error: 'Erro ao remover variantes do produto.' },
              { status: 500 }
            )
          }
        }

        // Processa cada item do snapshot: criar ou atualizar
        for (const item of snapshot) {
          const existing = item.id ? dbById.get(item.id) : undefined

          if (item.id && !existing) {
            return NextResponse.json(
              { error: `Variante referenciada não pertence a este produto (id: ${item.id}).` },
              { status: 400 }
            )
          }

          if (existing) {
            // --- ATUALIZAÇÃO ---
            const changed =
              existing.color_id !== item.color_id ||
              existing.size !== item.size ||
              existing.quantity !== item.quantity

            if (!changed) continue

            const { error: updateError } = await supabase
              .from('variants')
              .update({
                color_id: item.color_id,
                size: item.size,
                quantity: item.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id)

            if (updateError) {
              console.error('Erro ao atualizar variante:', item.id, updateError)
              return NextResponse.json(
                { error: `Erro ao atualizar variante ${item.id}.` },
                { status: 500 }
              )
            }

            // Registra movement de 'set' somente se quantity mudou
            if (existing.quantity !== item.quantity) {
              const { error: movError } = await supabase.from('movements').insert({
                variant_id: item.id,
                user_id: session.user_id,
                action: 'set',
                qty_before: existing.quantity,
                qty_after: item.quantity,
                delta: item.quantity - existing.quantity,
              })
              if (movError) {
                console.error('Erro ao registrar movement de set (variante atualizada):', item.id, movError)
              }
            }
          } else {
            // --- CRIAÇÃO ---
            const { data: created, error: insertError } = await supabase
              .from('variants')
              .insert({
                product_id: id,
                color_id: item.color_id,
                size: item.size,
                quantity: item.quantity,
              })
              .select('id, quantity')
              .single()

            if (insertError || !created) {
              console.error('Erro ao criar variante nova:', insertError)
              return NextResponse.json(
                { error: 'Erro ao criar variante nova.' },
                { status: 500 }
              )
            }

            const { error: movError } = await supabase.from('movements').insert({
              variant_id: created.id,
              user_id: session.user_id,
              action: 'create',
              qty_before: 0,
              qty_after: created.quantity,
              delta: created.quantity,
            })
            if (movError) {
              console.error('Erro ao registrar movement de criação (nova variante):', created.id, movError)
            }
          }
        }
      }
    }

    // --- Retorna produto com variantes atualizadas ---
    const { data: product, error: selectError } = await supabase
      .from('products')
      .select(`
        *,
        variants (
          id,
          color_id,
          size,
          quantity,
          created_at,
          updated_at,
          colors:color_id (
            id,
            name,
            hex,
            is_gradient,
            gradient_hex_2
          )
        )
      `)
      .eq('id', id)
      .single()

    if (selectError) {
      console.error('Erro ao buscar produto atualizado:', selectError)
      return NextResponse.json(
        { error: 'Produto atualizado, mas erro ao buscar estado final.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth()

    const { id } = await context.params

    // Exclusão permanente - variantes e movimentações são deletadas em cascata
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar produto:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar produto' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
