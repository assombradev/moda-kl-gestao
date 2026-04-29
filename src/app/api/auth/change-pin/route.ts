// Rota para alteração de PIN - POST
// Verifica o PIN atual, faz hash do novo e atualiza no banco

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { currentPin, newPin } = await request.json()

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { error: 'PIN atual e novo PIN são obrigatórios' },
        { status: 400 }
      )
    }

    if (newPin.length < 4) {
      return NextResponse.json(
        { error: 'O novo PIN deve ter pelo menos 4 dígitos' },
        { status: 400 }
      )
    }

    // Busca o hash atual do usuário
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('pin_hash')
      .eq('id', session.user_id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verifica o PIN atual
    const pinValid = await bcrypt.compare(currentPin, user.pin_hash)
    if (!pinValid) {
      return NextResponse.json(
        { error: 'PIN atual incorreto' },
        { status: 401 }
      )
    }

    // Gera hash do novo PIN e atualiza
    const newPinHash = await bcrypt.hash(newPin, 10)
    const { error: updateError } = await supabase
      .from('users')
      .update({ pin_hash: newPinHash, updated_at: new Date().toISOString() })
      .eq('id', session.user_id)

    if (updateError) {
      console.error('Erro ao atualizar PIN:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar PIN' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao alterar PIN:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
