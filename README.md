# Moda KL Gestão

Sistema interno de controle de estoque para a loja Moda KL (moda praia feminina). PWA mobile-first otimizado para iOS, com tema claro/escuro, autenticação por PIN e gestão completa de produtos, variações e movimentações de estoque.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Estilização**: Tailwind CSS + shadcn/ui + Framer Motion
- **Banco de dados**: Supabase (PostgreSQL + Storage)
- **Autenticação**: PIN de 4 dígitos com JWT em cookie httpOnly
- **Deploy**: Vercel

## Funcionalidades

- Login por PIN para 3 usuárias (Assombradox, Karen, Luanna)
- Dashboard com métricas: peças em estoque, modelos cadastrados, alertas de estoque baixo
- Cadastro de produtos com foto, nome, categoria, modelo, custo e variações (cor × tamanho × quantidade)
- SKU automático no formato `BK001-AZUL_MARINHO-M`
- Autocomplete crescente de modelos cadastrados durante o uso
- Cores pré-cadastradas + opção de criar cores customizadas com color picker
- Botões +/− para ajuste rápido de quantidade na lista de produtos
- Histórico completo de movimentações (quem alterou, quando, antes/depois)
- Tema claro/escuro/sistema com persistência
- PWA instalável no iPhone

## Como rodar localmente

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Crie um arquivo `.env.local` na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

4. Rode: `npm run dev`
5. Abra `http://localhost:3000`

## Deploy na Vercel

1. Conecte o repositório à Vercel
2. Configure as 3 variáveis de ambiente no painel da Vercel
3. Deploy automático a cada push na branch principal

## Trocar PIN de uma usuária

Cada usuária pode trocar o próprio PIN dentro do app, em **Configurações → Trocar PIN**.

## Licença

Uso interno. Não distribuir.
