// Rota que retorna dados do usuário autenticado
// Usada pelo layout do app para verificar se há sessão ativa

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  return NextResponse.json({
    user_id: session.user_id,
    name: session.name,
  })
}
