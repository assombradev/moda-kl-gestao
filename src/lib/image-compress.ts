// Compressão de imagem no lado do cliente usando browser-image-compression
// Reduz o tamanho antes do upload para economizar banda e armazenamento

import imageCompression from 'browser-image-compression'

// Opções padrão de compressão para fotos de produtos
const DEFAULT_OPTIONS = {
  maxSizeMB: 0.5, // Máximo de 500KB
  maxWidthOrHeight: 1024, // Máximo 1024px na maior dimensão
  useWebWorker: true,
  fileType: 'image/webp' as const, // Converte para WebP para menor tamanho
}

// Comprime uma imagem antes do upload
export async function compressImage(
  file: File,
  options?: Partial<typeof DEFAULT_OPTIONS>
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  try {
    const compressedBlob = await imageCompression(file, mergedOptions)

    // Garante que o resultado é um File com nome adequado
    const fileName = file.name.replace(/\.[^.]+$/, '.webp')
    return new File([compressedBlob], fileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error)
    // Em caso de falha na compressão, retorna o arquivo original
    return file
  }
}

// Gera uma URL de preview para exibição antes do upload
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

// Libera a memória da URL de preview quando não for mais necessária
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url)
}
