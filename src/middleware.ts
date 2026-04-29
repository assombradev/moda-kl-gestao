// Middleware de autenticação
// Protege rotas /app/*, redireciona para /login se não autenticado
// Renova o cookie se estiver próximo de expirar (< 7 dias)

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const COOKIE_NAME = 'moda-kl-session'
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const EXPIRY_DAYS = 30

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value

  // Se não tem token, redireciona para login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verifica se o token é válido
    const { payload } = await jwtVerify(token, JWT_SECRET)

    const response = NextResponse.next()

    // Verifica se precisa renovar (menos de 7 dias para expirar)
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000)
      const sevenDays = 7 * 24 * 60 * 60

      if (payload.exp - now < sevenDays) {
        // Renova o token com nova expiração
        const newToken = await new SignJWT({
          user_id: payload.user_id,
          name: payload.name,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime(`${EXPIRY_DAYS}d`)
          .sign(JWT_SECRET)

        response.cookies.set(COOKIE_NAME, newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: EXPIRY_DAYS * 24 * 60 * 60,
        })
      }
    }

    return response
  } catch {
    // Token inválido ou expirado - redireciona para login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

// Aplica middleware nas rotas protegidas (dashboard, produtos, configurações)
// Exclui explicitamente: /api/auth/login, /api/auth/users, /login, assets estáticos
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/produtos/:path*',
    '/configuracoes/:path*',
  ],
}
