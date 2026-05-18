// Rotas de produto individual - GET, PATCH, DELETE
// GET: produto com variantes e cores
// PATCH: atualiza campos do produto
// DELETE: exclusão permanente (hard delete)

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { generateUniqueSlug } from '@/lib/slug'

type RouteContext = { params: Promise<{ id: string }> }

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
    await requireAuth()

    const { id } = await context.params
    const updates = await request.json()

    // Campos permitidos para atualização
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

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      )
    }

    filteredUpdates.updated_at = new Date().toISOString()

    const { data: product, error } = await supabase
      .from('products')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar produto:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
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
