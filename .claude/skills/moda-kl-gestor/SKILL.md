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
- Constraint UNIQUE `variants_product_id_color_id_size_key` em (product_id, color_id, size) — banco bloqueia duplicatas com erro 23505 (confirmado em 2026-05-23). A validação de duplicata no frontend (ProductForm) é uma camada adicional mais amigável que expõe o erro antes de chegar ao banco.

### movements (64 linhas)
- id (uuid, PK), variant_id (uuid → variants.id, CASCADE), user_id (uuid → users.id, nullable — preserva a linha com NULL caso o usuário seja deletado), action (text — CHECK em 'create','increment','decrement','set','edit'), qty_before, qty_after, delta (int4), created_at

### product_images (0 linhas — tabela criada, ainda não populada)
- **8 colunas (pós-migration 0005, aplicada em 2026-05-20):**
  - id (uuid, PK, DEFAULT gen_random_uuid())
  - product_id (uuid, NOT NULL → products.id ON DELETE CASCADE)
  - url (text, NOT NULL)
  - position (integer, NOT NULL, DEFAULT 0)
  - is_cover (boolean, NOT NULL, DEFAULT false)
  - alt_text (text, nullable)
  - created_at (timestamptz, NOT NULL, DEFAULT now())
  - color_id (uuid, NOT NULL → colors.id ON DELETE CASCADE)
- **Constraints ativas:**
  - `product_images_unique_position_per_product_color` — UNIQUE (product_id, color_id, position)
- **Índices:**
  - `product_images_one_cover_per_product_color` — UNIQUE (product_id, color_id) WHERE is_cover = true
  - `idx_product_images_product_color` — btree (product_id, color_id)
  - `idx_product_images_product_id` — btree (product_id)
- As constraints antigas (`product_images_unique_position_per_product` e `product_images_one_cover_per_product`) foram dropadas pela migration 0005.

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

**PATCH /api/products/[id] — comportamento detalhado:**
- Campos escalares (name, category, model, cost_brl, price_brl, description, display_order, photo_url) são atualizados normalmente.
- Campo `variants` no body (opcional, snapshot diff):
  - Ausente → variants do banco não são tocadas (comportamento legado preservado)
  - `[]` (array vazio) → campo ignorado silenciosamente (proteção contra perda acidental de dados)
  - Array preenchido → diff contra estado atual do banco:
    - Item sem `id` → INSERT nova variant + movement `action='create'`
    - Item com `id` pertencente ao produto → UPDATE se mudou algo; se `quantity` mudou → movement `action='set'`; mudança de cor/tamanho não gera movement
    - Item com `id` que NÃO pertence ao produto → 400 "Variante referenciada não pertence a este produto"
    - Variants do banco ausentes do snapshot → DELETE (movements relacionados apagados via FK CASCADE)
    - Duplicata (color_id + size) no payload → 400 (banco também bloquearia via constraint UNIQUE)
- Retorno: produto completo com variants no mesmo formato do GET (`variants(id, color_id, size, quantity, created_at, updated_at, colors:color_id(...))`)

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
- `0005_add_color_to_product_images.sql` — adiciona color_id (uuid NOT NULL, FK → colors ON DELETE CASCADE) em product_images; dropa constraints por-produto antigas; cria constraints compostas (product_id, color_id) em posição e capa; cria índice de apoio. **Aplicada em 2026-05-20. Migration idempotente (IF NOT EXISTS / DROP IF EXISTS). Versionada no commit eba1abf.**

## Funcionalidades implementadas no gestor

- Formulário de produto tem campos de catálogo: price_brl (input decimal com vírgula como separador), description (textarea), display_order (input inteiro ≥ 0)
- Slug gerado automaticamente a partir do nome do produto (server-side, na criação e em edições que alterem o nome). Algoritmo em `src/lib/slug.ts`
- Componente Textarea em `src/components/ui/textarea.tsx` seguindo padrão shadcn/ui

### UI de variantes (agrupada por cor — entregue em 4b.1, 4b.2, 4b.3)

- Variantes exibidas agrupadas por cor; cada cor é um item de shadcn Accordion (múltiplos abertos simultaneamente, base-ui default)
- Header do Accordion: swatch da cor, nome, resumo ("X tamanhos, Y peças" ou "Sem estoque"), botão X de remoção
- Conteúdo do Accordion: 6 tamanhos fixos (PP, P, M, G, GG, Tamanho Único), cada um com input numérico e botão lixeira (lixeira só aparece se já existe como variant no banco)
- Adicionar cor: botão "+ Adicionar cor" abre Popover com lista das cores ainda não no produto + opção "Criar cor nova" (cria na tabela colors e já adiciona ao produto)
- Componentes: `src/components/products/SizeRow.tsx` (linha de tamanho) e `src/components/products/VariantColorGroup.tsx` (grupo de cor com Accordion + AlertDialog)
- Estado interno do ProductForm: Variant[] plano (sem agrupamento). Estrutura agrupada é derivada em tempo de render pela função pura `groupVariantsByColor`
- Variantes novas recebem id local `tmp-${crypto.randomUUID()}`. A função `prepareVariantsForApi` em `src/lib/variants.ts` detecta o prefixo e omite o id no payload pro PATCH (server trata como INSERT)
- Após save bem-sucedido: resposta do PATCH contém produto completo com ids reais; frontend atualiza state e força re-mount do ProductForm via `key={product.updated_at}` para que initialData reflita os ids do banco
- Confirmação destrutiva: remoção de cor inteira usa shadcn AlertDialog com botão "Remover" destrutivo e "Cancelar"; delete de tamanho individual NÃO tem confirmação (decisão UX deliberada — baixa destrutividade, ação facilmente reversível digitando o número de volta)
- Validação de duplicata (color_id + size) no submit: ProductForm verifica o array antes de chamar onSubmit; exibe Alert shadcn variant="destructive" acima do botão; estado submitError é limpo automaticamente a qualquer alteração de variante/cor
- Feedback de erro: erros do PATCH e DELETE na página de edição usam ConfirmModal com prop isError (círculo vermelho com X animado). alert() nativo eliminado da página de edição

## Decisões de design já tomadas

- Categorias e tamanhos são hardcoded em src/lib/constants.ts (CATEGORIES, SIZES, SKU_PREFIXES). Adicionar nova categoria exige alteração de código + migration SQL para atualizar o CHECK constraint.
- products.model é string livre, não FK para models. A tabela models existe apenas para autocomplete. Apagar uma row de models não quebra os products que usam aquela string.
- movements registra apenas alterações feitas via API. Alterações SQL diretas no banco não geram histórico.
- Não há soft delete em nenhuma tabela.
- Catálogo público lê apenas via view `products_public` e tabelas com RLS específico para anon. Nunca lê products direto. RLS é a fonte de verdade da segurança.
- Galeria de fotos do catálogo será por combinação produto + cor, não por produto inteiro. Isso permite mostrar a peça na cor específica que o cliente selecionar no catálogo.
- Fotos da galeria são exclusivas do catálogo. O campo photo_url em products continua sendo de uso interno do gestor.
- PATCH de variants segue padrão "fire-and-forget" sem transação no insert de movements (mantém o padrão do POST de produto). Falha no movement é logada via console.error mas não retorna 500.
- Mudança de cor/tamanho em variant existente é permitida sem trava (autonomia da dona). Só mudança de quantity gera movement.
- Deleção de variant é destrutiva e em cascata: movements relacionados são apagados via FK CASCADE, sem possibilidade de recuperação.
- Variants com quantity = 0 são aceitas no banco (variant válida cadastrada, representa tamanho esgotado mas ainda ativo no sistema).
- Snapshot vazio no PATCH (`variants: []`) é descartado silenciosamente por segurança — proteção contra bug de frontend que zere acidentalmente o array.

## Evolução planejada

- Adicionar abas (Dados internos / Dados do catálogo) no formulário de produto
- Galeria de fotos por combinação produto + cor (schema já pronto — migration 0005 aplicada em 2026-05-20; faltam os sub-blocos de UI de upload, listagem e persistência em product_images)
- Toggle de publicação no catálogo com validação de galeria não vazia
- Mudança da lista de produtos para grid 2 colunas
- Padronização gradual dos alert() nativos remanescentes em outras telas (produtos/novo, etc.) via ConfirmModal/AlertDialog

## Pontos de atenção conhecidos

- Modal "Deletar produto?" na página de edição não tem botão "Cancelar" explícito — fecha apenas clicando fora. Funcional, mas UX subótima. Anotado para revisão futura.
- `key={product.updated_at}` no ProductForm pode não forçar re-mount se duas edições ocorrerem dentro do mesmo segundo (cenário raro com 3 usuários internos). Aceito como padrão atual.
- alert() nativo ainda pode existir em pontos não auditados pela refatoração (ex: produtos/novo). A padronização via ConfirmModal/AlertDialog ocorre de forma gradual.

## Comportamento esperado em sessões futuras

Sempre que esta skill for carregada:
- Use o schema acima como referência primária antes de assumir qualquer coisa sobre estrutura de dados.
- Antes de propor qualquer migration, confirme com o operador humano que ela é aditiva e segura.
- Antes de qualquer alteração que envolva o banco, verifique se a operação respeita as regras de coexistência com o projeto Catálogo.
- Em caso de dúvida sobre estado atual, prefira CONSULTAR (via Supabase MCP ou perguntar ao humano) ao invés de inferir.

## Inconsistências detectadas durante criação da skill

Nenhuma — todos os pontos pendentes foram reconciliados contra o relatório técnico do banco fornecido pelo agente com acesso MCP ao Supabase.
