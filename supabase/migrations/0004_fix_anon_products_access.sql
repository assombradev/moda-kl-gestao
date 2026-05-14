-- =====================================================
-- Migration 0004: Corrige acesso anon ao catalogo publico
-- Data: 2026-05-13
-- Autor: Assombradox + Claude
--
-- Contexto: a migration 0003 criou view products_public e
-- policies em variants/product_images com subselects em
-- products. Mas como anon nao tinha policy nem grant em
-- products, os subselects retornavam falso e tudo era
-- bloqueado.
--
-- Esta migration corrige de forma cirurgica:
-- 1. Revoga privilegios padrao e concede SELECT apenas
--    nas colunas seguras de products (sem cost_brl,
--    photo_url, sequential_number, etc.)
-- 2. Cria policy em products permitindo anon ler APENAS
--    linhas com is_published = true
-- 3. Recria a view products_public sem security_invoker
--    (para ela rodar com privilegios do criador)
-- 4. Cria funcao is_product_published com SECURITY DEFINER
--    para uso nos subselects das policies de variants e
--    product_images
-- 5. Reescreve as policies de variants e product_images
--    usando a funcao
-- =====================================================

-- =====================================================
-- PARTE 1: GRANT seletivo em products
-- =====================================================
REVOKE ALL ON products FROM anon;
REVOKE ALL ON products FROM authenticated;

GRANT SELECT (
  id, name, category, model, price_brl,
  description, slug, display_order, published_at
) ON products TO anon;

GRANT SELECT (
  id, name, category, model, price_brl,
  description, slug, display_order, published_at
) ON products TO authenticated;

-- =====================================================
-- PARTE 2: Policy de leitura em products
-- =====================================================
CREATE POLICY "anon_select_published_products"
  ON products FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "auth_select_published_products"
  ON products FOR SELECT TO authenticated
  USING (is_published = true);

-- =====================================================
-- PARTE 3: Recriar view sem security_invoker
-- =====================================================
DROP VIEW IF EXISTS products_public;

CREATE VIEW products_public AS
SELECT
  id, name, category, model, price_brl,
  description, slug, display_order, published_at
FROM products
WHERE is_published = true;

GRANT SELECT ON products_public TO anon;
GRANT SELECT ON products_public TO authenticated;

-- =====================================================
-- PARTE 4: Funcao auxiliar com SECURITY DEFINER
-- =====================================================
-- SECURITY DEFINER faz a funcao rodar com privilegios do
-- criador (admin), permitindo que ela leia products mesmo
-- quando chamada pelo role anon.
-- STABLE: indica que a funcao nao modifica o banco e retorna
-- o mesmo valor para os mesmos argumentos dentro de uma query.
CREATE OR REPLACE FUNCTION is_product_published(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM products
    WHERE id = p_product_id AND is_published = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_product_published(uuid) TO anon;
GRANT EXECUTE ON FUNCTION is_product_published(uuid) TO authenticated;

-- =====================================================
-- PARTE 5: Reescrever policies de variants e product_images
-- =====================================================
DROP POLICY IF EXISTS "anon_select_published_variants" ON variants;
DROP POLICY IF EXISTS "auth_select_published_variants" ON variants;
DROP POLICY IF EXISTS "anon_select_published_product_images" ON product_images;
DROP POLICY IF EXISTS "auth_select_published_product_images" ON product_images;

CREATE POLICY "anon_select_published_variants"
  ON variants FOR SELECT TO anon
  USING (is_product_published(product_id));

CREATE POLICY "auth_select_published_variants"
  ON variants FOR SELECT TO authenticated
  USING (is_product_published(product_id));

CREATE POLICY "anon_select_published_product_images"
  ON product_images FOR SELECT TO anon
  USING (is_product_published(product_id));

CREATE POLICY "auth_select_published_product_images"
  ON product_images FOR SELECT TO authenticated
  USING (is_product_published(product_id));
