// Rota de movimentações - GET com filtros
// Suporta filtros por product_id, variant_id e limit

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const variantId = searchParams.get('variant_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('movements')
      .select(`
        *,
        users:user_id (
          id,
          name
        ),
        variants:variant_id (
          id,
          size,
          product_id,
          colors:color_id (
            id,
            name,
            hex
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filtro por variante específica
    if (variantId) {
      query = query.eq('variant_id', variantId)
    }

    // Filtro por produto (busca variantes do produto e filtra)
    if (productId && !variantId) {
      // Primeiro busca as variantes deste produto
      const { data: variants } = await supabase
        .from('variants')
        .select('id')
        .eq('product_id', productId)

      if (variants && variants.length > 0) {
        const variantIds = variants.map((v) => v.id)
        query = query.in('variant_id', variantIds)
      } else {
        // Se não tem variantes, retorna vazio
        return NextResponse.json({ movements: [] })
      }
    }

    const { data: movements, error } = await query

    if (error) {
      console.error('Erro ao buscar movimentações:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar movimentações' },
        { status: 500 }
      )
    }

    return NextResponse.json({ movements })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao listar movimentações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
