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

### models (17 linhas)
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

### movements (69 linhas)
- id (uuid, PK), variant_id (uuid → variants.id, CASCADE), user_id (uuid → users.id, nullable — preserva a linha com NULL caso o usuário seja deletado), action (text — CHECK em 'create','increment','decrement','set','edit'), qty_before, qty_after, delta (int4), created_at

### product_images (1 linha — em uso)
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
- Tipos aceitos: JPEG, PNG, WebP (**sem AVIF** — confirmado no route.ts de galeria; AVIF foi menção incorreta em versão anterior da skill)
- Compressão de imagem é feita no cliente antes do upload (src/lib/image-compress.ts)
- products.photo_url armazena URL pública completa — pasta raiz do bucket (ex: `{timestamp}-{random}.ext`)
- Fotos de galeria são salvas na subpasta `catalog/{product_id}/{timestamp}-{random}.webp`

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

**GET /api/products/[id] — mudanças recentes:**
- Retorna também `product_images` via join, ordenado por `(color_id ASC, position ASC)` — ordenação feita em JS após fetch (não via Supabase `.order()` com `referencedTable`)

**PATCH /api/products/[id] — comportamento detalhado:**
- Campos escalares (name, category, model, cost_brl, price_brl, description, display_order, photo_url, **is_published**) são atualizados normalmente.
- Campo `is_published`: ao setar `true`, valida via `validatePublish` (price_brl > 0, ao menos 1 variant com quantity > 0, ao menos 1 foto em product_images). Falha retorna 400 com lista de itens faltando.
- Campo `published_at`: setado **apenas na primeira publicação** (quando `is_published` passa de false para true E `published_at` atual no banco é NULL). Despublicar não altera `published_at`.
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

**POST /api/products — comportamento de is_published:**
- O campo `is_published` é **ignorado silenciosamente** no POST. Produto sempre criado com `is_published=false, published_at=null`.
- A publicação na criação é automatizada pela página `/produtos/novo`: após POST + upload de fotos, faz PATCH separado com `{ is_published: true }` se a dona ativou o toggle.

**POST/DELETE/PATCH /api/products/[id]/images — galeria de fotos por cor:**
- POST: recebe `FormData { photo: File, color_id: uuid }`. Valida MIME (jpeg/png/webp), tamanho (≤5MB), limite de 7 fotos por (product_id, color_id). Faz upload no Storage em `catalog/{product_id}/{timestamp}-{random}.webp`, insere em product_images. Primeira foto da cor vira capa automaticamente (`is_cover = true`). Retorna 201 com o registro criado.
- DELETE: recebe `{ image_id }`. Remove do Storage (falha tolerada) e do banco. Se era capa, promove próxima foto por position como nova capa. Retorna `{ deleted: true, promoted_cover_id: uuid | null }`.
- PATCH `set_cover`: recebe `{ set_cover: { image_id } }`. Unset capa atual primeiro (evita violação do partial unique index), depois set nova capa. Retorna `{ updated_cover_id }`.
- PATCH `reorder`: recebe `{ reorder: { color_id, ordered_ids[] } }`. Valida que o set de ids bate com o banco. Duas passagens de UPDATE (posições temporárias 1000+i, depois 0..n-1) para evitar colisão na constraint UNIQUE (product_id, color_id, position).
- Implementado em `src/app/api/products/[id]/images/route.ts`

**src/lib/publish-validator.ts — validador compartilhado:**
- Função pura `validatePublish({ priceBrl, variants, galleryCount })` usada tanto no frontend (ProductForm, tempo real) quanto no backend (PATCH handler).
- Retorna `{ canPublish: boolean, missing: string[] }`. `missing` lista em português o que falta.

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

## Componentes shadcn/ui instalados

Todos em `src/components/ui/`. Usam `@base-ui/react` (não Radix UI) — diferença crítica: sem prop `asChild`, eventos e state via data attributes (`data-checked`, `data-disabled`, etc.).

| Componente | Arquivo | Notas |
|---|---|---|
| accordion | accordion.tsx | Múltiplos itens abertos simultaneamente (base-ui default) |
| alert | alert.tsx | variant="destructive" usado para erros de validação no form |
| alert-dialog | alert-dialog.tsx | Confirmação destrutiva (ex: remover cor) |
| badge | badge.tsx | variants: default, secondary, destructive, outline, ghost, link |
| button | button.tsx | variants: default, destructive, outline, ghost, link; sizes incluem icon-sm |
| card | card.tsx | Instalado mas uso limitado — cards de produto são div manuais |
| dialog | dialog.tsx | Instalado |
| input | input.tsx | |
| label | label.tsx | |
| popover | popover.tsx | Usado no seletor de cor em variantes |
| scroll-area | scroll-area.tsx | Usado no histórico de movimentações |
| select | select.tsx | Instalado |
| separator | separator.tsx | Instalado |
| sheet | sheet.tsx | Histórico de movimentações (bottom sheet) |
| skeleton | skeleton.tsx | Usado no SkeletonCard |
| switch | switch.tsx | Toggle publicar; props: checked, onCheckedChange, disabled |
| tabs | tabs.tsx | Formulário em abas (Dados internos / Dados do catálogo) |
| textarea | textarea.tsx | Campo de descrição |

## Funcionalidades implementadas no gestor

- Slug gerado automaticamente a partir do nome do produto (server-side, na criação e em edições que alterem o nome). Algoritmo em `src/lib/slug.ts`

### Formulário em abas (Dados internos / Dados do catálogo)

- shadcn `Tabs` com 2 abas: "Dados internos" e "Dados do catálogo"
- **Aba interna:** foto do produto, nome, categoria, modelo, custo, variantes por cor
- **Aba catálogo:** toggle publicar, preço de venda, descrição, ordem de exibição, galeria por cor
- Estado é compartilhado entre as abas (único `useState` no ProductForm)
- Alert de erro de validação e botão "Salvar alterações" / "Cadastrar produto" ficam fora das abas, no rodapé do form

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

### Galeria de fotos por cor

- Componente: `src/components/products/GalleryColorBlock.tsx`
- Cada cor com variants ativas gera um bloco de galeria; cores removidas das variants limpam automaticamente a galeria local via `useEffect`
- Máximo 7 fotos por combinação (product_id, color_id)
- Compressão client-side: `compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1600 })` — saída em webp
- Primeira foto da cor vira capa automaticamente; capa é transferida para próxima foto ao deletar a capa atual (coberto em frontend e backend)
- **Modo edição:** upload imediato ao adicionar foto (cada ação persiste no banco via `src/lib/gallery-api.ts`); id local `local-{uuid}` é substituído pelo id real do banco após sucesso
- **Modo criação:** galeria fica em estado local (id `local-{uuid}`); após POST do produto, página `/produtos/novo` faz upload sequencial e, se ativado, PATCH de publicação
- Helpers REST: `src/lib/gallery-api.ts` — funções `uploadGalleryPhoto`, `deleteGalleryPhoto`, `setCoverGalleryPhoto`, `reorderGalleryPhotos`; todas lançam `Error` em resposta não-ok
- GET de produto agora retorna `product_images` mapeadas para `GalleryPhoto[]` (`initialGallery` do ProductForm)

### Toggle publicar no catálogo

- Switch do shadcn na aba "Dados do catálogo" (início, antes do preço)
- Badge verde "No catálogo" aparece no topo do form quando `is_published === true`
- Validação em camadas:
  - **Frontend (tempo real):** `validatePublish` computa `canPublish` e `missing` a cada render; Switch fica disabled se `!canPublish && !isPublished`
  - **Backend:** PATCH valida via 3 queries paralelas ao banco (price_brl, variants com stock, count de product_images)
- `published_at` é setado APENAS na primeira publicação (null → timestamp). Despublicar não zera.
- **Fluxo criação com publicação:** POST produto → upload fotos sequencial → PATCH `{ is_published: true }`. Se alguma etapa falha, modal de erro consolidado (sem redirect automático). Se tudo OK, modal de sucesso normal.

### Lista de produtos em grid responsivo

- Grid: 2 colunas mobile / 3 colunas tablet (md) / 4 colunas desktop (lg)
- Classes: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4`
- Componente: `src/components/products/ProductCard.tsx` — card compacto (sem SKU, total de peças ou modelo exibidos; padding p-3, fonte text-sm)
- Chips de variantes (cor + tamanho + quantidade) coloridos por status: verde/amarelo/vermelho
- Badge de status ("Esgotado"/"Baixo"/"Em estoque") sobreposta na foto
- `next/image sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"` — ajustado para o grid
- Skeleton: `src/components/common/SkeletonCard.tsx` — 2 elementos (nome + categoria), padding p-3
- Filtros, busca e ordenação por `created_at DESC` mantidos sem alteração

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
- Upload de galeria segue ordem Storage → banco. Se o insert em product_images falhar após upload no Storage, o arquivo fica órfão — aceito por design (complexidade de rollback não justificada para galeria).
- Upload de galeria é sequencial (não em lote) tanto na criação quanto na edição — simplicidade e rastreabilidade de falhas individuais.
- Parsing de path do Storage no DELETE de imagem depende da string `/storage/v1/object/public/produtos/` na URL. Falha de parse é logada mas não impede a deleção do registro no banco.
- Re-mount do ProductForm via `key={product.updated_at}` após save bem-sucedido — garante que initialData e initialGallery reflitam os ids reais do banco sem lógica de reconciliação manual.
- ConfirmModal com `isError` é o padrão para erros de operação nas páginas de edição e criação. alert() nativo é legado e está sendo eliminado gradualmente.

## Evolução planejada

- Padronização gradual dos alert() nativos remanescentes (ex: erro de criação em /produtos/novo ainda usa alert() nativo) via ConfirmModal/AlertDialog

## Pontos de atenção conhecidos

- Modal "Deletar produto?" na página de edição não tem botão "Cancelar" explícito — fecha apenas clicando fora. Funcional, mas UX subótima. Anotado para revisão futura.
- `key={product.updated_at}` no ProductForm pode não forçar re-mount se duas edições ocorrerem dentro do mesmo segundo (cenário raro com 3 usuários internos). Aceito como padrão atual.
- alert() nativo ainda existe em alguns pontos (ex: erro de criação de produto em /produtos/novo). A padronização ocorre de forma gradual.
- Arquivos de galeria ficam órfãos no Storage quando um produto é deletado via UI — o CASCADE no banco apaga os registros de product_images, mas os objetos no bucket `produtos/catalog/{product_id}/` não são removidos automaticamente.
- Position das fotos não é compactada após deleção — se a foto 0 é deletada, as restantes continuam com positions 1, 2, 3... (não há reindexação automática). Funcional mas pode gerar lacunas que causam confusão ao depurar.
- Validação de publicação no PATCH usa `updates.variants` (snapshot incoming) para checar estoque se `hasVariants` for true, mas queries o banco para variants se `hasVariants` for false. Se `hasVariants=true` e o array estiver vazio (edge case), a validação nega a publicação mesmo que o banco tenha variants com estoque.
- Ordenação da lista de produtos usa `created_at DESC` — o campo `display_order` existe e é editável, mas não é usado na ordenação da lista interna do gestor (apenas o catálogo público o usa).

## Comportamento esperado em sessões futuras

Sempre que esta skill for carregada:
- Use o schema acima como referência primária antes de assumir qualquer coisa sobre estrutura de dados.
- Antes de propor qualquer migration, confirme com o operador humano que ela é aditiva e segura.
- Antes de qualquer alteração que envolva o banco, verifique se a operação respeita as regras de coexistência com o projeto Catálogo.
- Em caso de dúvida sobre estado atual, prefira CONSULTAR (via Supabase MCP ou perguntar ao humano) ao invés de inferir.

## Inconsistências detectadas durante criação da skill

Nenhuma — todos os pontos pendentes foram reconciliados contra o relatório técnico do banco fornecido pelo agente com acesso MCP ao Supabase.
