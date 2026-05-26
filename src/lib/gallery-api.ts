// Helpers de chamada às rotas REST da galeria de fotos.
// Todas as funções lançam Error em caso de resposta não-ok.

export async function uploadGalleryPhoto(
  productId: string,
  colorId: string,
  file: File
): Promise<{ id: string; product_id: string; color_id: string; url: string; position: number; is_cover: boolean; alt_text: string | null; created_at: string }> {
  const fd = new FormData()
  fd.append('photo', file)
  fd.append('color_id', colorId)

  const res = await fetch(`/api/products/${productId}/images`, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Erro ao subir foto')
  }

  return (await res.json()).image
}

export async function deleteGalleryPhoto(
  productId: string,
  imageId: string
): Promise<{ deleted: boolean; promoted_cover_id: string | null }> {
  const res = await fetch(`/api/products/${productId}/images`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_id: imageId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Erro ao deletar foto')
  }

  return res.json()
}

export async function setCoverGalleryPhoto(
  productId: string,
  imageId: string
): Promise<{ updated_cover_id: string }> {
  const res = await fetch(`/api/products/${productId}/images`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ set_cover: { image_id: imageId } }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Erro ao marcar como capa')
  }

  return res.json()
}

export async function reorderGalleryPhotos(
  productId: string,
  colorId: string,
  orderedIds: string[]
): Promise<{ reordered: boolean }> {
  const res = await fetch(`/api/products/${productId}/images`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reorder: { color_id: colorId, ordered_ids: orderedIds } }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Erro ao reordenar fotos')
  }

  return res.json()
}
