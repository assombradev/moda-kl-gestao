// Rota de modelo individual - PATCH (renomear) e DELETE
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data: model, error } = await supabase
      .from('models')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um modelo com este nome' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 })
    }

    return NextResponse.json({ model })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    // Verifica se algum produto usa este modelo
    const { data: model } = await supabase
      .from('models')
      .select('name')
      .eq('id', id)
      .single()

    if (model) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('model', model.name)

      if (count && count > 0) {
        return NextResponse.json(
          { error: `Este modelo está sendo usado por ${count} produto(s)` },
          { status: 409 }
        )
      }
    }

    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao deletar modelo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
