// Gerenciamento de sessão JWT usando jose
// Criação, leitura e validação de tokens para autenticação

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'moda-kl-session'
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const EXPIRY_DAYS = 30

export interface SessionPayload {
  user_id: string
  name: string
}

// Cria um token JWT e define o cookie de sessão
export async function createSession(userId: string, userName: string): Promise<string> {
  const token = await new SignJWT({ user_id: userId, name: userName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRY_DAYS * 24 * 60 * 60, // 30 dias em segundos
  })

  return token
}

// Lê e valida a sessão atual a partir dos cookies
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      user_id: payload.user_id as string,
      name: payload.name as string,
    }
  } catch {
    return null
  }
}

// Exige autenticação - retorna sessão ou lança erro
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Não autenticado')
  }
  return session
}

// Verifica se o token está próximo de expirar (menos de 7 dias)
export async function shouldRenewToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.exp) return false

    const now = Math.floor(Date.now() / 1000)
    const sevenDays = 7 * 24 * 60 * 60
    return (payload.exp - now) < sevenDays
  } catch {
    return false
  }
}

// Renova o token mantendo os mesmos dados da sessão
export async function renewSession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const newToken = await new SignJWT({
      user_id: payload.user_id,
      name: payload.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${EXPIRY_DAYS}d`)
      .sign(JWT_SECRET)

    return newToken
  } catch {
    return null
  }
}
