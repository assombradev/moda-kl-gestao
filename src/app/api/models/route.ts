// Rotas de modelos - GET (listar/buscar), POST (criar), DELETE (remover)

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    let query = supabase
      .from('models')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })

    // Busca por nome se query fornecida
    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    const { data: models, error } = await query

    if (error) {
      console.error('Erro ao buscar modelos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar modelos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ models })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao listar modelos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome do modelo é obrigatório' },
        { status: 400 }
      )
    }

    const { data: model, error } = await supabase
      .from('models')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um modelo com este nome' },
          { status: 409 }
        )
      }
      console.error('Erro ao criar modelo:', error)
      return NextResponse.json(
        { error: 'Erro ao criar modelo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ model }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao criar modelo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do modelo é obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar modelo:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar modelo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao deletar modelo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
