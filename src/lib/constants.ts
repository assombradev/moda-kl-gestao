// Constantes da aplicação Moda KL Gestão

// Categorias de produtos disponíveis
export const CATEGORIES = [
  'Biquíni',
  'Saída',
  'Body',
  'Top',
  'Calcinha',
] as const

export type Category = (typeof CATEGORIES)[number]

// Tamanhos disponíveis
export const SIZES = [
  'PP',
  'P',
  'M',
  'G',
  'GG',
  'Tamanho Único',
] as const

export type Size = (typeof SIZES)[number]

// Mapeamento de categoria para prefixo SKU
export const SKU_PREFIXES: Record<Category, string> = {
  'Biquíni': 'BK',
  'Saída': 'SD',
  'Body': 'BD',
  'Top': 'TP',
  'Calcinha': 'CL',
}

// Ações de movimentação de estoque
export const MOVEMENT_ACTIONS = [
  'create',
  'increment',
  'decrement',
  'set',
  'edit',
] as const

export type MovementAction = (typeof MOVEMENT_ACTIONS)[number]

// Nome do cookie de sessão
export const COOKIE_NAME = 'moda-kl-session'

// Duração da sessão em dias
export const SESSION_DURATION_DAYS = 30
