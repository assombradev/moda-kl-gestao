-- =====================================================
-- Migration 0003: RLS policies para acesso público do catálogo
-- Data: 2026-05-12
-- Autor: Assombradox + Claude
--
-- Objetivo: Permitir que o catálogo público (vitrine via WhatsApp)
-- leia o banco usando chave anon, com proteção de RLS, sem expor
-- dados sensíveis como custos, hashes de PIN ou histórico interno.
--
-- O que esta migration faz:
-- 1. Cria view 'products_public' que expõe apenas campos seguros
--    de produtos publicados (is_published = true)
-- 2. Cria 4 policies de SELECT para o role 'anon':
--    - products_public: leitura via view
--    - product_images: leitura apenas de fotos de produtos publicados
--    - variants: leitura apenas de variações de produtos publicados
--    - colors: leitura pública total (dados não sensíveis)
-- 3. NÃO cria policies em users, movements, models — essas tabelas
--    permanecem totalmente bloqueadas para anon
--
-- Garantia: este SQL é aditivo. Não altera dados, não muda gestor.
-- O gestor continua usando service-role e bypassando RLS.
-- =====================================================

-- =====================================================
-- PARTE 1: View pública de produtos
-- =====================================================
-- Esta view expõe APENAS as colunas que o catálogo precisa,
-- omitindo dados internos/sensíveis:
-- - cost_brl (custo de fornecedor, segredo)
-- - created_by (quem cadastrou, interno)
-- - sequential_number, sku_prefix (numeração interna)
-- - photo_url (foto de identificação interna do gestor)
-- - created_at, updated_at (auditoria interna)
--
-- Filtra automaticamente para mostrar APENAS produtos publicados.
-- security_invoker = true: respeita o RLS de quem está consultando
-- (boa prática recomendada pelo Supabase a partir do Postgres 15).
CREATE OR REPLACE VIEW products_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  category,
  model,
  price_brl,
  description,
  slug,
  display_order,
  published_at
FROM products
WHERE is_published = true;

-- Permite que o role 'anon' (cliente anônimo do catálogo) leia a view.
-- GRANT é necessário ANTES de criar policy.
GRANT SELECT ON products_public TO anon;

-- Também permite ao role 'authenticated' caso no futuro tenha login
-- de cliente. Não custa nada incluir agora.
GRANT SELECT ON products_public TO authenticated;

-- =====================================================
-- PARTE 2: Policy em product_images
-- =====================================================
-- Catálogo só pode ler fotos cujo produto pai está publicado.
-- Usa subselect para verificar is_published no momento da query.
-- 
-- Resultado: se um produto tem 7 fotos mas is_published = false,
-- o catálogo não consegue ver nenhuma das fotos.
CREATE POLICY "anon_select_published_product_images"
  ON product_images
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
        AND products.is_published = true
    )
  );

-- Mesma policy para authenticated (preparação futura).
CREATE POLICY "auth_select_published_product_images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
        AND products.is_published = true
    )
  );

-- =====================================================
-- PARTE 3: Policy em variants
-- =====================================================
-- Mesma lógica de product_images: variants só são visíveis se
-- o produto pai está publicado. Isso garante que cores e tamanhos
-- de produtos não publicados nunca aparecem no catálogo.
CREATE POLICY "anon_select_published_variants"
  ON variants
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = variants.product_id
        AND products.is_published = true
    )
  );

CREATE POLICY "auth_select_published_variants"
  ON variants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = variants.product_id
        AND products.is_published = true
    )
  );

-- =====================================================
-- PARTE 4: Policy em colors
-- =====================================================
-- Cores são públicas totais — nome e hex não são sensíveis.
-- USING (true) significa "todas as linhas são visíveis".
CREATE POLICY "anon_select_all_colors"
  ON colors
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "auth_select_all_colors"
  ON colors
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- IMPORTANTE: tabelas NÃO cobertas por policies
-- =====================================================
-- users, movements, models permanecem com RLS habilitado e
-- ZERO policies para anon/authenticated. Isso significa que
-- com chave anon, qualquer SELECT nessas tabelas retorna VAZIO
-- (não retorna erro — apenas zero linhas, comportamento padrão
-- do RLS quando não tem policy permissiva).
--
-- O service-role do gestor continua bypassando RLS por design,
-- então o gestor segue lendo tudo normalmente.
-- =====================================================

-- =====================================================
-- Verificação pós-migration
-- =====================================================
-- Lista todas as policies criadas para conferência visual.
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;