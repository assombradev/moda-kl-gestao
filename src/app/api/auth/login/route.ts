// Rota de login - POST
// Recebe userId e pin, verifica com bcrypt, cria sessão JWT

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase-server'
import { createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json()

    if (!userId || !pin) {
      return NextResponse.json(
        { error: 'userId e pin são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca o usuário pelo ID
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, pin_hash')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    // Verifica o PIN com bcrypt
    const pinValid = await bcrypt.compare(pin, user.pin_hash)
    if (!pinValid) {
      return NextResponse.json(
        { error: 'PIN incorreto' },
        { status: 401 }
      )
    }

    // Cria a sessão JWT e define o cookie
    await createSession(user.id, user.name)

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name },
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
