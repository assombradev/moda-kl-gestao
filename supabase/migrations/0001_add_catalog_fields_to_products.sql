-- =====================================================
-- Migration 0001: Adiciona campos de catálogo em products
-- Data: 2026-05-12
-- Autor: Assombradox + Claude
--
-- Objetivo: Preparar a tabela products para suportar o
-- catálogo público (vitrine via WhatsApp), adicionando
-- campos que existem apenas no escopo do catálogo e não
-- são necessários para o gestor de estoque.
--
-- Características desta migration:
-- - 100% aditiva (apenas ADD COLUMN)
-- - Não altera dados existentes
-- - Não remove nem renomeia colunas
-- - Defaults seguros para não quebrar inserts existentes
-- - Compatível com os produtos já cadastrados
-- =====================================================

-- Coluna 1: price_brl (preço de venda em reais)
-- Tipo numeric com 2 casas decimais (formato monetário).
-- Nullable porque os produtos atuais não têm preço cadastrado.
-- Vai ser preenchido manualmente pelas donas no gestor.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_brl numeric(10,2);

-- Coluna 2: description (descrição/copy do produto)
-- Texto livre, suporta parágrafos longos com quebras de linha.
-- Nullable porque produto pode ser cadastrado sem descrição.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description text;

-- Coluna 3: is_published (flag de publicação no catálogo)
-- Default FALSE: produto novo nasce não publicado por segurança.
-- Isso garante que cadastros recém-feitos no gestor não vazem
-- automaticamente para o catálogo público antes de revisão.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Coluna 4: slug (URL amigável do produto)
-- Texto único, gerado automaticamente a partir do nome do modelo.
-- Exemplo: "biquini-cortininha-coral"
-- Nullable inicialmente porque os produtos existentes ainda não
-- têm slug definido. Será preenchido na próxima fase.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug text;

-- Constraint UNIQUE para slug, criada separadamente para suportar
-- nullable. Múltiplos NULLs não conflitam entre si, mas valores
-- preenchidos precisam ser únicos.
ALTER TABLE products
  ADD CONSTRAINT products_slug_unique UNIQUE (slug);

-- Coluna 5: display_order (ordem manual de exibição no catálogo)
-- Default 0: todos os produtos começam empatados. Quanto MAIOR
-- o número, mais alto o produto aparece no catálogo. Permite
-- curadoria manual de destaque pelas donas.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Coluna 6: published_at (timestamp de quando foi publicado)
-- Nullable: produto não publicado tem este campo NULL.
-- Útil para ordenar por "novidades" no catálogo.
-- Quando is_published vira true, este campo deve ser preenchido
-- pelo backend com NOW() (lógica implementada na Etapa 5).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- =====================================================
-- Verificação pós-migration:
-- Lista as colunas atuais de products para confirmar que
-- as 6 novas estão presentes.
-- =====================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
ORDER BY ordinal_position;