// Rotas de cores - GET (listar), POST (criar), DELETE (remover)
// Cores padrão (is_default=true) não podem ser deletadas

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()

    const { data: colors, error } = await supabase
      .from('colors')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar cores:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar cores' },
        { status: 500 }
      )
    }

    return NextResponse.json({ colors })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao listar cores:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const { name, hex, is_gradient, gradient_hex_2 } = await request.json()

    if (!name || !hex) {
      return NextResponse.json(
        { error: 'Nome e cor hexadecimal são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: color, error } = await supabase
      .from('colors')
      .insert({
        name: name.trim(),
        hex,
        is_gradient: is_gradient || false,
        gradient_hex_2: is_gradient ? gradient_hex_2 : null,
        is_default: false, // Cores criadas pelo usuário nunca são padrão
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma cor com este nome' },
          { status: 409 }
        )
      }
      console.error('Erro ao criar cor:', error)
      return NextResponse.json(
        { error: 'Erro ao criar cor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ color }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao criar cor:', error)
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
        { error: 'ID da cor é obrigatório' },
        { status: 400 }
      )
    }

    // Verifica se é uma cor padrão
    const { data: color, error: fetchError } = await supabase
      .from('colors')
      .select('is_default')
      .eq('id', id)
      .single()

    if (fetchError || !color) {
      return NextResponse.json(
        { error: 'Cor não encontrada' },
        { status: 404 }
      )
    }

    if (color.is_default) {
      return NextResponse.json(
        { error: 'Cores padrão não podem ser removidas' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar cor:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar cor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao deletar cor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
