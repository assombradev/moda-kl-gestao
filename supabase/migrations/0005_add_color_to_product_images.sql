-- =====================================================
-- Migration 0005: Adiciona color_id em product_images
-- Data: 2026-05-20
-- Autor: Assombradox + Claude
--
-- Objetivo: Reestruturar product_images para suportar
-- galeria por combinação produto + cor. Hoje a galeria é
-- só por produto. A nova estrutura permite que cada
-- combinação (produto, cor) tenha sua própria galeria de
-- fotos com sua capa e ordenação independente.
--
-- Pré-requisitos confirmados via auditoria:
-- - Tabela product_images está VAZIA (count = 0)
-- - Nenhuma FK externa aponta para product_images
-- - Constraint de capa única é índice parcial, não
--   constraint formal (será dropada com DROP INDEX)
-- - Policies de RLS usam product_id e não são afetadas
--
-- Mudanças:
-- 1. Adiciona coluna color_id (uuid NOT NULL, FK para colors)
-- 2. Dropa constraints/índices antigos (baseados em product_id)
-- 3. Recria constraints/índices novos (baseados em product_id + color_id)
-- 4. Cria índice de apoio para a nova combinação
--
-- Garantia: como a tabela estava vazia, foi seguro adicionar
-- coluna NOT NULL sem default. Sem backfill necessário.
-- =====================================================
-- Esta migration é idempotente: pode ser executada múltiplas vezes sem erro.
-- Aplicada manualmente no SQL Editor em 2026-05-20.
-- =====================================================

-- =====================================================
-- PARTE 1: Dropar constraints e índices antigos
-- =====================================================
-- A constraint de position única (formal em pg_constraint).
ALTER TABLE product_images
  DROP CONSTRAINT IF EXISTS product_images_unique_position_per_product;

-- A "constraint" de capa única é, na verdade, um índice parcial.
-- Por isso usa DROP INDEX (não DROP CONSTRAINT).
DROP INDEX IF EXISTS product_images_one_cover_per_product;

-- O índice de apoio em product_id continua útil para queries
-- que filtram só por produto. Mantemos.
-- (NÃO dropar: idx_product_images_product_id)

-- =====================================================
-- PARTE 2: Adicionar coluna color_id
-- =====================================================
-- Tipo uuid, NOT NULL.
-- FK para colors(id) com ON DELETE CASCADE: se a cor for
-- deletada, todas as fotos dessa cor são removidas.
-- O frontend mostra aviso antes (decisão de UX).
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS color_id uuid NOT NULL
    REFERENCES colors(id) ON DELETE CASCADE;

-- =====================================================
-- PARTE 3: Recriar constraints com a nova chave composta
-- =====================================================
-- Position única por combinação produto + cor.
-- Permite que dois produtos diferentes tenham fotos na
-- mesma position, e que duas cores diferentes do mesmo
-- produto também tenham fotos na mesma position.
ALTER TABLE product_images
  DROP CONSTRAINT IF EXISTS product_images_unique_position_per_product_color;
ALTER TABLE product_images
  ADD CONSTRAINT product_images_unique_position_per_product_color
    UNIQUE (product_id, color_id, position);

-- Capa única por combinação produto + cor (índice parcial).
-- Garante apenas UMA foto com is_cover = true por combinação
-- de produto + cor. Cada cor do produto tem sua própria capa.
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_cover_per_product_color
  ON product_images(product_id, color_id)
  WHERE is_cover = true;

-- =====================================================
-- PARTE 4: Índice de apoio para queries por produto + cor
-- =====================================================
-- A query mais comum no catálogo será:
-- "fotos da cor X do produto Y, ordenadas por position".
-- Este índice acelera essa query.
CREATE INDEX IF NOT EXISTS idx_product_images_product_color
  ON product_images(product_id, color_id);

-- =====================================================
-- Verificação pós-migration
-- =====================================================
-- Lista a estrutura atualizada da tabela para conferência.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_images'
ORDER BY ordinal_position;

-- E lista as constraints/índices ativos.
SELECT
  i.relname AS index_name,
  pg_get_indexdef(idx.indexrelid) AS index_def
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'product_images'
ORDER BY i.relname;

-- =====================================================
