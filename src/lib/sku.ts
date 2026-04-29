// Utilitários para geração e formatação de SKU
// Formato: PREFIXO + NÚMERO(3 dígitos) + '-' + COR + '-' + TAMANHO
// Exemplo: BK001-AZUL_MARINHO-M

import { SKU_PREFIXES } from './constants'

// Formata o SKU a partir dos componentes
export function formatSku(
  skuPrefix: string,
  sequentialNumber: number,
  colorName: string,
  size: string
): string {
  const number = String(sequentialNumber).padStart(3, '0')
  const normalizedColor = normalizeColorForSku(colorName)
  return `${skuPrefix}${number}-${normalizedColor}-${size}`
}

// Normaliza o nome da cor para uso no SKU (sem acentos, maiúsculas, espaços viram _)
export function normalizeColorForSku(colorName: string): string {
  return removeAccents(colorName)
    .toUpperCase()
    .replace(/\s+/g, '_')
}

// Remove acentos de uma string (versão client-side sem depender de unaccent do Postgres)
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Obtém o prefixo SKU para uma categoria
export function getSkuPrefix(category: string): string | undefined {
  return SKU_PREFIXES[category as keyof typeof SKU_PREFIXES]
}

// Extrai componentes de um SKU formatado
export function parseSku(sku: string): {
  prefix: string
  number: number
  color: string
  size: string
} | null {
  const match = sku.match(/^([A-Z]{2})(\d{3})-(.+)-([A-Z]+(?:\s[A-ZÚ]+)?)$/)
  if (!match) return null

  return {
    prefix: match[1],
    number: parseInt(match[2], 10),
    color: match[3],
    size: match[4],
  }
}
