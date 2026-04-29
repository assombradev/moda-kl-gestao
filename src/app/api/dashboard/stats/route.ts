// Rota que retorna estatísticas do dashboard
// Total de peças, total de modelos, alertas de estoque baixo

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase-server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Total de peças em estoque (soma de todas as quantidades)
  const { data: piecesData } = await supabase
    .from('variants')
    .select('quantity')

  const totalPieces = piecesData?.reduce((sum, v) => sum + (v.quantity || 0), 0) ?? 0

  // Total de modelos (produtos distintos)
  const { count: totalModels } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  // Alertas de estoque baixo (quantity > 0 AND quantity <= 4)
  const { count: lowStockAlerts } = await supabase
    .from('variants')
    .select('*', { count: 'exact', head: true })
    .gt('quantity', 0)
    .lte('quantity', 4)

  return NextResponse.json({
    totalPieces,
    totalModels: totalModels ?? 0,
    lowStockAlerts: lowStockAlerts ?? 0,
  })
}
