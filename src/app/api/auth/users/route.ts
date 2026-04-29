// Rota pública - retorna lista de usuários (id e nome) para a tela de login
// NÃO retorna o pin_hash por segurança

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function GET() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name')
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }

  return NextResponse.json({ users })
}
