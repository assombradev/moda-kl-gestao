// Rota de logout - POST
// Limpa o cookie de sessão

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'moda-kl-session'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expira imediatamente
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
