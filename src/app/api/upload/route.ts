// Rota de upload de imagem - POST
// Recebe FormData com arquivo de imagem, faz upload para o bucket "produtos"
// A compressão é feita no cliente antes do envio

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Valida tipo do arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou AVIF.' },
        { status: 400 }
      )
    }

    // Gera nome único para o arquivo
    const fileExt = file.name.split('.').pop() || 'webp'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

    // Upload para o bucket "produtos" no Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json(
        { error: 'Erro ao fazer upload do arquivo' },
        { status: 500 }
      )
    }

    // Retorna a URL pública do arquivo
    const { data: publicData } = supabase.storage
      .from('produtos')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicData.publicUrl,
      fileName,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
