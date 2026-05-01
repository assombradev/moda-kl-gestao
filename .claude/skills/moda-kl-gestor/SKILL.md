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

- Framework: Next.js 15 (App Router) + TypeScript
- Estilização: Tailwind CSS + shadcn/ui + Framer Motion
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
- RLS está habilitado em todas as tabelas, mas sem policies configuradas — funciona porque service_role bypassa RLS por design.

## Schema atual (resumo)

### users (3 linhas)
- id (uuid, PK), name (text, unique), pin_hash (text, bcrypt), created_at (timestamptz, default now()), updated_at (timestamptz)

### models (10 linhas)
- id (uuid, PK), name (text, unique), last_used_at (timestamptz, nullable), created_at (timestamptz, default now())
- Não possui updated_at.
- Relacionamento com products é por string livre em products.model (não FK — não há integridade referencial entre models e products).

### colors (10 linhas: 9 default + 1 customizada)
- id (uuid, PK), name (text, unique), hex (text), is_gradient (bool), gradient_hex_2 (text, nullable), is_default (bool), created_at

### products (13 linhas)
- id (uuid, PK), name (text), category (text — CHECK em 'Biquíni','Saída','Body','Top','Calcinha'), model (text NOT NULL, string livre — sem FK), cost_brl (numeric), photo_url (text), sequential_number (int4, gerado pela RPC next_sku_number — não é SEQUENCE nativa), sku_prefix (text — CHECK em 'BK','SD','BD','TP','CL'), created_by (uuid → users.id), created_at, updated_at

### variants (21 linhas)
- id (uuid, PK), product_id (uuid → products.id, CASCADE), color_id (uuid → colors.id), size (text — CHECK em 'PP','P','M','G','GG','Tamanho Único'), quantity (int4, CHECK ≥ 0), created_at, updated_at

### movements (21 linhas)
- id (uuid, PK), variant_id (uuid → variants.id, CASCADE), user_id (uuid → users.id, nullable — preserva a linha com NULL caso o usuário seja deletado), action (text — CHECK em 'create','increment','decrement','set','edit'), qty_before, qty_after, delta (int4), created_at

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

## Ausência de migrations versionadas

ATENÇÃO: este repositório atualmente NÃO possui migrations versionadas. O schema vive apenas no Supabase remoto. Está planejado criar a pasta supabase/migrations/ e um snapshot inicial (0001_initial_schema.sql) como parte da próxima evolução do projeto. Até lá, considere o estado atual do banco remoto como fonte de verdade.

## Decisões de design já tomadas

- Categorias e tamanhos são hardcoded em src/lib/constants.ts (CATEGORIES, SIZES, SKU_PREFIXES). Adicionar nova categoria exige alteração de código + migration SQL para atualizar o CHECK constraint.
- products.model é string livre, não FK para models. A tabela models existe apenas para autocomplete. Apagar uma row de models não quebra os products que usam aquela string.
- movements registra apenas alterações feitas via API. Alterações SQL diretas no banco não geram histórico.
- Não há soft delete em nenhuma tabela.

## Evolução planejada (campos a serem adicionados para suportar o catálogo)

As próximas migrations adicionarão à tabela products:
- price_brl (numeric, nullable inicialmente para não quebrar dados existentes)
- description (text, nullable)
- is_published (boolean, default false)
- slug (text, unique, nullable inicialmente)
- display_order (int4, default 0)
- published_at (timestamptz, nullable)

E uma tabela nova product_images (id, product_id FK, url, position, alt_text). A coluna photo_url permanecerá em products como capa, por compatibilidade.

Após essas migrations, será necessário também criar policies de RLS para permitir leitura pública de products (apenas onde is_published = true), variants, colors e product_images via chave anon.

## Comportamento esperado em sessões futuras

Sempre que esta skill for carregada:
- Use o schema acima como referência primária antes de assumir qualquer coisa sobre estrutura de dados.
- Antes de propor qualquer migration, confirme com o operador humano que ela é aditiva e segura.
- Antes de qualquer alteração que envolva o banco, verifique se a operação respeita as regras de coexistência com o projeto Catálogo.
- Em caso de dúvida sobre estado atual, prefira CONSULTAR (via Supabase MCP ou perguntar ao humano) ao invés de inferir.

## Inconsistências detectadas durante criação da skill

Nenhuma — todos os pontos pendentes foram reconciliados contra o relatório técnico do banco fornecido pelo agente com acesso MCP ao Supabase.
