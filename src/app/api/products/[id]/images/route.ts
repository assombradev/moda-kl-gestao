// Galeria de fotos por produto + cor
// POST: faz upload de 1 foto e insere em product_images
// DELETE: remove 1 foto do Storage + banco; promove nova capa se necessário
// PATCH: set_cover (marca uma foto como capa) ou reorder (reordena posições)

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_PHOTOS_PER_COLOR = 7

// ---------------------------------------------------------------------------
// POST /api/products/[id]/images
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { id: product_id } = await context.params

    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const color_id = formData.get('color_id') as string | null

    if (!photo) {
      return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })
    }
    if (!color_id) {
      return NextResponse.json({ error: 'color_id obrigatório' }, { status: 400 })
    }
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Foto excede 5MB' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 400 })
    }

    // Verifica limite de 7 fotos por (product_id, color_id)
    const { count: photoCount, error: countError } = await supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)
      .eq('color_id', color_id)

    if (countError) {
      console.error('Erro ao contar fotos:', countError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if ((photoCount ?? 0) >= MAX_PHOTOS_PER_COLOR) {
      return NextResponse.json({ error: 'Limite de 7 fotos por cor atingido' }, { status: 400 })
    }

    // Próxima position: MAX atual + 1, ou 0 se for a primeira
    const { data: maxPosRow, error: maxPosError } = await supabase
      .from('product_images')
      .select('position')
      .eq('product_id', product_id)
      .eq('color_id', color_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxPosError) {
      console.error('Erro ao calcular próxima posição:', maxPosError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const position = maxPosRow ? maxPosRow.position + 1 : 0

    // is_cover = true somente se não houver capa ainda para esta combinação
    const { count: coverCount, error: coverCountError } = await supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)
      .eq('color_id', color_id)
      .eq('is_cover', true)

    if (coverCountError) {
      console.error('Erro ao verificar capa existente:', coverCountError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const is_cover = (coverCount ?? 0) === 0

    // Upload no Storage: catalog/{product_id}/{timestamp}-{random}.webp
    const random = Math.random().toString(36).substring(7)
    const storagePath = `catalog/${product_id}/${Date.now()}-${random}.webp`

    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(storagePath, photo, { contentType: photo.type, upsert: false })

    if (uploadError) {
      console.error('Erro no upload da foto de galeria:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage
      .from('produtos')
      .getPublicUrl(storagePath)

    // Insere registro em product_images (foto fica órfã no Storage se o insert falhar — aceito por design)
    const { data: image, error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id,
        color_id,
        url: publicData.publicUrl,
        position,
        is_cover,
        alt_text: null,
      })
      .select('id, product_id, color_id, url, position, is_cover, alt_text, created_at')
      .single()

    if (insertError || !image) {
      console.error('Erro ao inserir foto (arquivo órfão em Storage):', storagePath, insertError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    console.log(`[POST /api/products/${product_id}/images] Foto criada: ${image.id}`)
    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao criar foto de galeria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/products/[id]/images
// Body: { "image_id": "uuid" }
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { id: product_id } = await context.params
    const body = await request.json()
    const { image_id } = body ?? {}

    if (!image_id) {
      return NextResponse.json({ error: 'image_id obrigatório' }, { status: 400 })
    }

    // Busca a foto garantindo que pertence ao produto
    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('id, product_id, color_id, url, is_cover, position')
      .eq('id', image_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Erro ao buscar foto para deleção:', fetchError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if (!image) {
      return NextResponse.json({ error: 'Foto não encontrada neste produto' }, { status: 404 })
    }

    // Extrai o path de Storage a partir da URL pública
    // Formato: {SUPABASE_URL}/storage/v1/object/public/produtos/{storagePath}
    let storagePath: string | null = null
    try {
      const parsed = new URL(image.url)
      const marker = '/storage/v1/object/public/produtos/'
      const markerIdx = parsed.pathname.indexOf(marker)
      if (markerIdx >= 0) {
        storagePath = parsed.pathname.slice(markerIdx + marker.length)
      }
    } catch {
      console.error('Não foi possível parsear URL da foto para deleção no Storage:', image.url)
    }

    // Tenta deletar do Storage; falha é tolerada (arquivo pode já não existir)
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('produtos')
        .remove([storagePath])
      if (storageError) {
        console.error('Erro ao remover arquivo do Storage (continuando):', storagePath, storageError)
      }
    }

    // Deleta o registro do banco
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', image_id)

    if (deleteError) {
      console.error('Erro ao deletar registro da foto:', deleteError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    // Se era capa, promove a foto de menor position restante como nova capa
    let promoted_cover_id: string | null = null

    if (image.is_cover) {
      const { data: next, error: nextError } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', product_id)
        .eq('color_id', image.color_id)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextError) {
        console.error('Erro ao buscar próxima foto para promoção de capa:', nextError)
      } else if (next) {
        const { error: promoteError } = await supabase
          .from('product_images')
          .update({ is_cover: true })
          .eq('id', next.id)

        if (promoteError) {
          console.error('Erro ao promover nova capa:', next.id, promoteError)
        } else {
          promoted_cover_id = next.id
          console.log(`[DELETE /api/products/${product_id}/images] Nova capa promovida: ${next.id}`)
        }
      }
    }

    console.log(`[DELETE /api/products/${product_id}/images] Foto deletada: ${image_id}`)
    return NextResponse.json({ deleted: true, promoted_cover_id })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao deletar foto de galeria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/products/[id]/images
// Body: { "set_cover": { "image_id": "uuid" } }
//    ou { "reorder": { "color_id": "uuid", "ordered_ids": ["uuid", ...] } }
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth()

    const { id: product_id } = await context.params
    const body = await request.json()

    // --- Operação: set_cover ---
    if ('set_cover' in body) {
      const { image_id } = body.set_cover ?? {}

      if (!image_id) {
        return NextResponse.json({ error: 'image_id obrigatório em set_cover' }, { status: 400 })
      }

      const { data: image, error: fetchError } = await supabase
        .from('product_images')
        .select('id, color_id')
        .eq('id', image_id)
        .eq('product_id', product_id)
        .maybeSingle()

      if (fetchError) {
        console.error('Erro ao buscar foto para set_cover:', fetchError)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
      }

      if (!image) {
        return NextResponse.json({ error: 'Foto não encontrada neste produto' }, { status: 404 })
      }

      // Unset primeiro para evitar violação do partial unique index
      // (product_id, color_id) WHERE is_cover = true
      const { error: unsetError } = await supabase
        .from('product_images')
        .update({ is_cover: false })
        .eq('product_id', product_id)
        .eq('color_id', image.color_id)
        .eq('is_cover', true)

      if (unsetError) {
        console.error('Erro ao desmarcar capa atual:', unsetError)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
      }

      const { error: setCoverError } = await supabase
        .from('product_images')
        .update({ is_cover: true })
        .eq('id', image_id)

      if (setCoverError) {
        console.error('Erro ao marcar nova capa:', image_id, setCoverError)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
      }

      console.log(`[PATCH /api/products/${product_id}/images] Nova capa definida: ${image_id}`)
      return NextResponse.json({ updated_cover_id: image_id })
    }

    // --- Operação: reorder ---
    if ('reorder' in body) {
      const { color_id, ordered_ids } = body.reorder ?? {}

      if (!color_id) {
        return NextResponse.json({ error: 'color_id obrigatório em reorder' }, { status: 400 })
      }
      if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
        return NextResponse.json(
          { error: 'ordered_ids deve ser um array não vazio' },
          { status: 400 }
        )
      }

      // Valida que ordered_ids corresponde exatamente ao conjunto de fotos existentes
      const { data: currentImages, error: fetchError } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', product_id)
        .eq('color_id', color_id)

      if (fetchError) {
        console.error('Erro ao buscar fotos para reorder:', fetchError)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
      }

      const currentIds = new Set((currentImages ?? []).map((r: { id: string }) => r.id))
      const incomingIds = new Set(ordered_ids as string[])

      const setsMatch =
        currentIds.size === incomingIds.size &&
        [...incomingIds].every((id) => currentIds.has(id))

      if (!setsMatch) {
        return NextResponse.json(
          { error: 'Lista de IDs não corresponde às fotos desta cor' },
          { status: 400 }
        )
      }

      // Duas passagens para evitar colisão na constraint UNIQUE (product_id, color_id, position)
      // Passagem 1: posições temporárias altas (1000, 1001, ...)
      for (let i = 0; i < ordered_ids.length; i++) {
        const { error } = await supabase
          .from('product_images')
          .update({ position: 1000 + i })
          .eq('id', ordered_ids[i])

        if (error) {
          console.error('Erro ao reordenar (passagem 1):', ordered_ids[i], error)
          return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
        }
      }

      // Passagem 2: posições finais (0, 1, 2, ...)
      for (let i = 0; i < ordered_ids.length; i++) {
        const { error } = await supabase
          .from('product_images')
          .update({ position: i })
          .eq('id', ordered_ids[i])

        if (error) {
          console.error('Erro ao reordenar (passagem 2):', ordered_ids[i], error)
          return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
        }
      }

      console.log(`[PATCH /api/products/${product_id}/images] Reordenadas ${ordered_ids.length} fotos para color_id ${color_id}`)
      return NextResponse.json({ reordered: true })
    }

    return NextResponse.json(
      { error: 'Operação não reconhecida. Use set_cover ou reorder.' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro ao processar operação de galeria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
