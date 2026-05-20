---
name: moda-kl-gestor
description: Contexto e regras do projeto Moda KL Gestão (sistema interno de controle de estoque). Use sempre que trabalhar neste repositório para entender o domínio, o schema, as decisões arquiteturais e as regras críticas de coexistência com o projeto Catálogo Público que consome o mesmo banco Supabase.
---

# Moda KL Gestão — Contexto do Projeto

## Aviso crítico de coexistência

Este banco de dados Supabase (projeto fybgmjofigsazvyiphot) é compartilhado com o projeto **Moda KL Catálogo** (vitrine pública para clientes via WhatsApp), que está em desenvolvimento em repositório separado. Toda alteração de schema feita aqui afeta o catálogo em produção.

Regras absolutas:
- Nunca remover colunas existentes em products, variants, colors, models, movements, users sem coordenação explícita.
- Nunca renomear colunas que o catálogo possa estar lendo (todas as de products, variants, colors são candidatas).
- Nunca alterar tipo de coluna existente.
- Migrations devem ser sempre aditivas (ADD COLUMN, CREATE TABLE, CREATE INDEX, ADD CONSTRAINT).
- Sempre que adicionar coluna nova, definir DEFAULT seguro para não quebrar inserts existentes.

## Stack

- Framework: Next.js 16.2.4 (App Router + Turbopack) + TypeScript
- **Atenção: Next.js 16 tem breaking changes em relação a versões anteriores, especialmente em async params de rotas. Verificar documentação oficial atual ao mexer em rotas/APIs.**
- Estilização: Tailwind CSS v4 + shadcn/ui + Framer Motion
- Banco: Supabase (PostgreSQL 17.6 + Storage)
- Auth: PIN de 4 dígitos com JWT em cookie httpOnly (lib jose, HS256, expiração 30 dias)
- Hospedagem: Vercel
- PWA mobile-first otimizado para iOS

## Identidade do Supabase

- Project ID: fybgmjofigsazvyiphot
- Region: us-east-1
- Plano: Free (sem branches disponíveis — toda migration vai direto em produção)
- Schema usado: public

## Variáveis de ambiente esperadas

- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (secreta, apenas server-side)
- JWT_SECRET (base64, 32 bytes, usada para assinar/verificar cookie de sessão)

## Arquitetura de acesso ao banco

- Existe APENAS cliente Supabase server-side (src/lib/supabase-server.ts), usando service_role.
- O frontend NUNCA acessa o Supabase diretamente. Toda comunicação passa por API routes em src/app/api/*.
- Não existe cliente anon configurado neste projeto. (O catálogo público é quem usa anon + RLS.)
- RLS está habilitado em todas as tabelas. O gestor usa service_role, que bypassa RLS por design. As policies existentes servem exclusivamente ao catálogo público.

## Schema atual (resumo)

### users (3 linhas)
- id (uuid, PK), name (text, unique), pin_hash (text, bcrypt), created_at (timestamptz, default now()), updated_at (timestamptz)

### models (14 linhas)
- id (uuid, PK), name (text, unique), last_used_at (timestamptz, nullable), created_at (timestamptz, default now())
- Não possui updated_at.
- Relacionamento com products é por string livre em products.model (não FK — não há integridade referencial entre models e products).

### colors (10 linhas: 9 default + 1 customizada)
- id (uuid, PK), name (text, unique), hex (text), is_gradient (bool), gradient_hex_2 (text, nullable), is_default (bool), created_at

### products (28 linhas)
- id (uuid, PK), name (text), category (text — CHECK em 'Biquíni','Saída','Body','Top','Calcinha'), model (text NOT NULL, string livre — sem FK), cost_brl (numeric), photo_url (text), sequential_number (int4, gerado pela RPC next_sku_number — não é SEQUENCE nativa), sku_prefix (text — CHECK em 'BK','SD','BD','TP','CL'), created_by (uuid → users.id), created_at, updated_at
- **Colunas de catálogo (já em produção):** price_brl (numeric, nullable), description (text, nullable), is_published (boolean, NOT NULL DEFAULT false), slug (text, nullable, unique), display_order (int4, NOT NULL DEFAULT 0), published_at (timestamptz, nullable)
- Todos os 28 produtos têm slug populado (nenhum NULL).

### variants (36 linhas)
- id (uuid, PK), product_id (uuid → products.id, CASCADE), color_id (uuid → colors.id), size (text — CHECK em 'PP','P','M','G','GG','Tamanho Único'), quantity (int4, CHECK ≥ 0), created_at, updated_at

### movements (64 linhas)
- id (uuid, PK), variant_id (uuid → variants.id, CASCADE), user_id (uuid → users.id, nullable — preserva a linha com NULL caso o usuário seja deletado), action (text — CHECK em 'create','increment','decrement','set','edit'), qty_before, qty_after, delta (int4), created_at

### product_images (0 linhas — tabela criada, ainda não populada)
- id (uuid, PK, DEFAULT gen_random_uuid()), product_id (uuid, NOT NULL → products.id CASCADE), url (text, NOT NULL), position (integer, NOT NULL DEFAULT 0), is_cover (boolean, NOT NULL DEFAULT false), alt_text (text, nullable), created_at (timestamptz, NOT NULL DEFAULT now())
- Constraints: `product_images_unique_position_per_product` (UNIQUE product_id + position), `product_images_one_cover_per_product` (UNIQUE product_id WHERE is_cover = true)

### Extensões habilitadas no banco
- pgcrypto (gen_random_uuid)
- uuid-ossp
- unaccent (usada na geração do SKU)

## Modelagem de variações

Cada combinação cor × tamanho é uma row em variants. Não há JSON nem array. SKU é computado em tempo de leitura pela fórmula exata:

`products.sku_prefix || lpad(products.sequential_number::text, 3, '0') || '-' || replace(unaccent(upper(colors.name)), ' ', '_') || '-' || variants.size`

Exemplo concreto: produto com `sku_prefix='BK'`, `sequential_number=1`, cor `'Azul Marinho'`, tamanho `'M'` → `BK001-AZUL_MARINHO-M`.

A geração de `sequential_number` é feita pela RPC `next_sku_number(cat text)` no banco — função custom que retorna o próximo número disponível para a categoria informada. **Não usa SEQUENCE nativa do Postgres.**

## Storage

- Bucket único: produtos
- Configuração: público (URL direta via getPublicUrl, sem signed URL)
- Tipos aceitos: JPEG, PNG, WebP, AVIF
- Compressão de imagem é feita no cliente antes do upload (src/lib/image-compress.ts)
- products.photo_url armazena URL pública completa

## RLS e acesso público (catálogo)

RLS está habilitado em todas as 7 tabelas. As policies abaixo foram criadas pelas migrations 0003 e 0004 exclusivamente para servir o catálogo público.

**Policies ativas (confirmadas no banco):**

| Tabela | Policy | Role | Condição |
|---|---|---|---|
| products | anon_select_published_products | anon | is_published = true |
| products | auth_select_published_products | authenticated | is_published = true |
| variants | anon_select_published_variants | anon | is_product_published(product_id) |
| variants | auth_select_published_variants | authenticated | is_product_published(product_id) |
| product_images | anon_select_published_product_images | anon | is_product_published(product_id) |
| product_images | auth_select_published_product_images | authenticated | is_product_published(product_id) |
| colors | anon_select_all_colors | anon | true (irrestrito) |
| colors | auth_select_all_colors | authenticated | true (irrestrito) |

**Outros objetos criados pelas migrations de catálogo:**
- Função SQL `is_product_published(uuid)` com `SECURITY DEFINER STABLE` — usada como predicado nas policies de variants e product_images
- View `products_public` — expõe apenas colunas seguras de produtos publicados
- GRANT seletivo em products para anon e authenticated: SELECT restrito às colunas `id, name, category, model, price_brl, description, slug, display_order, published_at` — **sem** cost_brl, photo_url, created_by, pin_hash, etc.

**Tabelas sem policy permissiva (bloqueadas para anon):** users, movements, models. Nenhuma dessas é acessível pelo catálogo.

## API Routes existentes (resumo)

Auth (públicas): GET /api/auth/users, POST /api/auth/login, POST /api/auth/logout
Auth (protegidas): GET /api/auth/me, POST /api/auth/change-pin
Produtos: GET/POST /api/products, GET/PATCH/DELETE /api/products/[id]
Variações: PATCH /api/variants/[id]
Cores: GET/POST/DELETE /api/colors
Modelos: GET/POST /api/models, PATCH/DELETE /api/models/[id] (canônica), DELETE /api/models (legada — recebe id no body, mantida por compatibilidade)
Movimentações: GET /api/movements
Upload: POST /api/upload
Dashboard: GET /api/dashboard/stats

Todas as rotas (exceto as de auth público) usam requireAuth() para validar o cookie JWT antes de qualquer operação.

## Migrations versionadas

A pasta `supabase/migrations/` existe e contém as seguintes migrations aplicadas em produção:

- `20260501224847_remote_schema.sql` — snapshot inicial do schema remoto
- `0001_add_catalog_fields_to_products.sql` — adiciona price_brl, description, is_published, slug, display_order, published_at em products
- `0002_create_product_images.sql` — cria a tabela product_images com constraints
- `0003_setup_public_rls_policies.sql` — cria função is_product_published, view products_public, policies de RLS e GRANTs para anon
- `0004_fix_anon_products_access.sql` — corrige acesso anon ao catálogo público

## Funcionalidades implementadas no gestor

- Formulário de produto tem campos de catálogo: price_brl (input decimal com vírgula como separador), description (textarea), display_order (input inteiro ≥ 0)
- Slug gerado automaticamente a partir do nome do produto (server-side, na criação e em edições que alterem o nome). Algoritmo em `src/lib/slug.ts`
- Componente Textarea em `src/components/ui/textarea.tsx` seguindo padrão shadcn/ui

## Decisões de design já tomadas

- Categorias e tamanhos são hardcoded em src/lib/constants.ts (CATEGORIES, SIZES, SKU_PREFIXES). Adicionar nova categoria exige alteração de código + migration SQL para atualizar o CHECK constraint.
- products.model é string livre, não FK para models. A tabela models existe apenas para autocomplete. Apagar uma row de models não quebra os products que usam aquela string.
- movements registra apenas alterações feitas via API. Alterações SQL diretas no banco não geram histórico.
- Não há soft delete em nenhuma tabela.
- Catálogo público lê apenas via view `products_public` e tabelas com RLS específico para anon. Nunca lê products direto. RLS é a fonte de verdade da segurança.
- Galeria de fotos do catálogo será por combinação produto + cor, não por produto inteiro. Isso permite mostrar a peça na cor específica que o cliente selecionar no catálogo.
- Fotos da galeria são exclusivas do catálogo. O campo photo_url em products continua sendo de uso interno do gestor.

## Evolução planejada

- Refatoração da UI de variantes para agrupar por cor
- Adicionar abas (Dados internos / Dados do catálogo) no formulário de produto
- Galeria de fotos por combinação produto + cor (exige migration adicionando color_id em product_images)
- Toggle de publicação no catálogo com validação de galeria não vazia
- Mudança da lista de produtos para grid 2 colunas

## Comportamento esperado em sessões futuras

Sempre que esta skill for carregada:
- Use o schema acima como referência primária antes de assumir qualquer coisa sobre estrutura de dados.
- Antes de propor qualquer migration, confirme com o operador humano que ela é aditiva e segura.
- Antes de qualquer alteração que envolva o banco, verifique se a operação respeita as regras de coexistência com o projeto Catálogo.
- Em caso de dúvida sobre estado atual, prefira CONSULTAR (via Supabase MCP ou perguntar ao humano) ao invés de inferir.

## Inconsistências detectadas durante criação da skill

Nenhuma — todos os pontos pendentes foram reconciliados contra o relatório técnico do banco fornecido pelo agente com acesso MCP ao Supabase.
