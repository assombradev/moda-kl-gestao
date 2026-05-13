-- =====================================================
-- Migration 0002: Cria tabela product_images
-- Data: 2026-05-12
-- Autor: Assombradox + Claude
--
-- Objetivo: Armazenar as fotos do catálogo público
-- (vitrine via WhatsApp). Esta tabela é completamente
-- independente do campo photo_url em products.
--
-- IMPORTANTE: products.photo_url é SOMENTE para uso
-- interno do gestor (identificação visual das peças
-- pelas donas). As fotos desta tabela são as únicas
-- que aparecem no catálogo público.
--
-- Características desta migration:
-- - 100% aditiva (tabela nova, zero impacto no gestor)
-- - Não altera nem lê dados existentes
-- - Inclui constraints para garantir integridade:
--   * Apenas uma foto pode ser capa por produto
--   * Posições únicas dentro do mesmo produto
--   * CASCADE: se o produto for deletado, fotos vão junto
-- - Inclui índice em product_id para performance no catálogo
--
-- Limites validados no frontend (NÃO no banco):
-- - Máximo 7 fotos por produto
-- - Bloqueio de publicação se galeria vazia
-- - Quando capa é deletada, próxima por position vira capa
-- =====================================================

-- Criação da tabela product_images
CREATE TABLE IF NOT EXISTS product_images (
  -- Identificador único da foto.
  -- UUID gerado automaticamente, padrão do projeto.
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao produto dono desta foto.
  -- ON DELETE CASCADE: se o produto for deletado,
  -- todas as fotos associadas são deletadas junto.
  -- Padrão consistente com variants e movements.
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- URL pública da imagem hospedada no Supabase Storage.
  -- Mesma estrutura que products.photo_url usa hoje.
  -- NOT NULL porque foto sem URL não faz sentido.
  url text NOT NULL,
  
  -- Posição/ordem manual da foto na galeria.
  -- Número inteiro, quanto menor mais cedo aparece.
  -- Default 0, mas a UI do gestor vai atribuir sequencialmente.
  -- A unicidade dentro do produto é garantida pela constraint
  -- product_images_unique_position_per_product (mais abaixo).
  position integer NOT NULL DEFAULT 0,
  
  -- Flag de capa: indica qual foto é a "principal" do produto
  -- no catálogo público (aparece em primeiro lugar nas listagens,
  -- thumbnail dos cards, etc.)
  -- Default false: foto nova nasce não-capa.
  -- A regra "apenas UMA capa por produto" é garantida pelo
  -- índice único parcial product_images_one_cover_per_product
  -- (mais abaixo).
  is_cover boolean NOT NULL DEFAULT false,
  
  -- Texto alternativo para acessibilidade e SEO.
  -- Nullable: a dona preenche se quiser, ou deixa vazio.
  -- O frontend do catálogo aplica fallback ("Foto de [nome do produto]")
  -- quando este campo está vazio.
  alt_text text,
  
  -- Timestamp de criação da foto.
  -- Útil para ordenação por "fotos mais recentes" se necessário.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Índices e constraints
-- =====================================================

-- Índice em product_id para acelerar a query mais comum:
-- "buscar todas as fotos do produto X" (rodada toda vez
-- que o catálogo monta uma página de produto).
CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
  ON product_images(product_id);

-- Constraint: posições únicas dentro do mesmo produto.
-- Impede que duas fotos do mesmo produto tenham position = 2
-- (o que causaria ambiguidade na ordenação).
-- Produtos diferentes podem ter a mesma position normalmente.
ALTER TABLE product_images
  ADD CONSTRAINT product_images_unique_position_per_product
  UNIQUE (product_id, position);

-- Índice único parcial: garante apenas UMA capa por produto.
-- Sintaxe especial do Postgres que cria índice único só nas
-- linhas onde is_cover = true. Linhas com is_cover = false
-- não são restritas (podem haver várias).
-- 
-- Resultado: tentar inserir uma segunda foto com is_cover = true
-- para o mesmo product_id gera erro de constraint violation.
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_cover_per_product
  ON product_images(product_id)
  WHERE is_cover = true;

-- =====================================================
-- Verificação pós-migration:
-- Lista a estrutura da tabela criada para confirmação visual.
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_images'
ORDER BY ordinal_position;