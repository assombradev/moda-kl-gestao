// Rotas de produtos - GET (listar) e POST (criar)
// GET suporta busca por nome/SKU e filtros por categoria/status
// POST recebe FormData com foto + dados JSON

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { SKU_PREFIXES } from '@/lib/constants'
import type { Category } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const categories = searchParams.get('categories') // múltiplas separadas por vírgula
    const status = searchParams.get('status')
    const statuses = searchParams.get('statuses')

    // Query base: produtos com variantes e cores
    let query = supabase
      .from('products')
      .select(`
        *,
        variants (
          id,
          color_id,
          size,
          quantity,
          colors:color_id (
            id,
            name,
            hex,
            is_gradient,
            gradient_hex_2
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Filtro por categoria (singular ou múltiplas)
    if (categories) {
      const catList = categories.split(',').filter(Boolean)
      if (catList.length > 0) {
        query = query.in('category', catList)
      }
    } else if (category) {
      query = query.eq('category', category)
    }

    // Busca por nome
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar produtos' },
        { status: 500 }
      )
    }

    // Filtro por status - feito em memória pois depende das quantidades por variante
    // Regras:
    //   - "baixo": produto tem ALGUMA variante com quantity > 0 E quantity <= 4
    //   - "esgotado": TODAS as variantes têm quantity === 0
    //   - "em_estoque": total de peças > 0 e nenhuma variante com estoque baixo
    let filteredProducts = products || []
    const statusList = statuses ? statuses.split(',').filter(Boolean) : status ? [status] : []

    if (statusList.length > 0) {
      filteredProducts = filteredProducts.filter((p) => {
        const variants = p.variants || []
        const total = variants.reduce((sum: number, v: { quantity: number }) => sum + (v.quantity || 0), 0)
        const hasLowStockVariant = variants.some((v: { quantity: number }) => v.quantity > 0 && v.quantity <= 4)
        const allZero = variants.length > 0 && variants.every((v: { quantity: number }) => (v.quantity || 0) === 0)

        if (statusList.includes('baixo') && hasLowStockVariant) return true
        if (statusList.includes('esgotado') && (variants.length === 0 || allZero)) return true
        if (statusList.includes('em_estoque') && total > 0 && !hasLowStockVariant) return true
        return false
      })
    }

    return NextResponse.json({ products: filteredProducts })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao listar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const formData = await request.formData()
    const photo = formData.get('photo') as File | null

    // Lê os campos individuais do FormData
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const model = formData.get('model') as string
    const costStr = formData.get('cost') as string
    const variantsStr = formData.get('variants') as string
    const cost_brl = costStr ? parseFloat(costStr.replace(',', '.')) : null
    const variants = variantsStr ? JSON.parse(variantsStr) : []

    // Validações básicas
    if (!name || !category || !model) {
      return NextResponse.json(
        { error: 'Nome, categoria e modelo são obrigatórios' },
        { status: 400 }
      )
    }

    if (!photo) {
      return NextResponse.json(
        { error: 'Foto do produto é obrigatória' },
        { status: 400 }
      )
    }

    const skuPrefix = SKU_PREFIXES[category as Category]
    if (!skuPrefix) {
      return NextResponse.json(
        { error: 'Categoria inválida' },
        { status: 400 }
      )
    }

    // Upload da foto
    let photoUrl = ''
    if (photo) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, photo, {
          contentType: photo.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        return NextResponse.json(
          { error: 'Erro ao fazer upload da foto' },
          { status: 500 }
        )
      }

      const { data: publicData } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName)

      photoUrl = publicData.publicUrl
    }

    // Gera o número sequencial usando a função SQL (parâmetro da função é 'cat')
    const { data: seqData, error: seqError } = await supabase
      .rpc('next_sku_number', { cat: category })

    if (seqError) {
      console.error('Erro ao gerar número sequencial:', seqError)
      return NextResponse.json(
        { error: 'Erro ao gerar SKU' },
        { status: 500 }
      )
    }

    const sequentialNumber = seqData as number

    // Cria ou atualiza o modelo (upsert por nome)
    await supabase
      .from('models')
      .upsert({ name: model, last_used_at: new Date().toISOString() }, { onConflict: 'name' })

    // Cria o produto
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        category,
        model,
        cost_brl: cost_brl || null,
        photo_url: photoUrl,
        sequential_number: sequentialNumber,
        sku_prefix: skuPrefix,
        created_by: session.user_id,
      })
      .select()
      .single()

    if (productError) {
      console.error('Erro ao criar produto:', productError)
      return NextResponse.json(
        { error: 'Erro ao criar produto' },
        { status: 500 }
      )
    }

    // Cria as variantes e registra movimentações
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantsToInsert = variants.map(
        (v: { color_id: string; size: string; quantity: number }) => ({
          product_id: product.id,
          color_id: v.color_id,
          size: v.size,
          quantity: v.quantity || 0,
        })
      )

      const { data: createdVariants, error: variantError } = await supabase
        .from('variants')
        .insert(variantsToInsert)
        .select()

      if (variantError) {
        console.error('Erro ao criar variantes:', variantError)
        return NextResponse.json(
          { error: 'Erro ao criar variantes' },
          { status: 500 }
        )
      }

      // Registra movimentações de criação para cada variante
      if (createdVariants) {
        const movements = createdVariants.map((v) => ({
          variant_id: v.id,
          user_id: session.user_id,
          action: 'create',
          qty_before: 0,
          qty_after: v.quantity,
          delta: v.quantity,
        }))

        await supabase.from('movements').insert(movements)
      }
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
