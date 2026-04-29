// Rota de variante individual - PATCH
// Atualiza quantidade da variante e registra movimentação
// Ações: increment, decrement, set

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth()

    const { id } = await context.params
    const { action, quantity } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Ação é obrigatória' },
        { status: 400 }
      )
    }

    // Busca a variante atual
    const { data: variant, error: fetchError } = await supabase
      .from('variants')
      .select('id, quantity')
      .eq('id', id)
      .single()

    if (fetchError || !variant) {
      return NextResponse.json(
        { error: 'Variante não encontrada' },
        { status: 404 }
      )
    }

    const qtyBefore = variant.quantity
    let qtyAfter: number

    // Calcula nova quantidade baseado na ação
    switch (action) {
      case 'increment':
        qtyAfter = qtyBefore + (quantity || 1)
        break
      case 'decrement':
        qtyAfter = Math.max(0, qtyBefore - (quantity || 1))
        break
      case 'set':
        if (quantity === undefined || quantity === null) {
          return NextResponse.json(
            { error: 'Quantidade é obrigatória para ação "set"' },
            { status: 400 }
          )
        }
        qtyAfter = Math.max(0, quantity)
        break
      default:
        return NextResponse.json(
          { error: 'Ação inválida. Use: increment, decrement ou set' },
          { status: 400 }
        )
    }

    const delta = qtyAfter - qtyBefore

    // Atualiza a quantidade da variante
    const { data: updatedVariant, error: updateError } = await supabase
      .from('variants')
      .update({
        quantity: qtyAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar variante:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar variante' },
        { status: 500 }
      )
    }

    // Registra a movimentação
    await supabase.from('movements').insert({
      variant_id: id,
      user_id: session.user_id,
      action,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      delta,
    })

    return NextResponse.json({ variant: updatedVariant })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao atualizar variante:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
