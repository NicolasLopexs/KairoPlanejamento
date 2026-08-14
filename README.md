# Cronograma de Clientes

Painel para gerenciar cronogramas de postagem (feed, stories e orientações de
captação) de vários clientes, com login separado para a equipe e para cada
cliente.

- **Front-end:** Vite + React + TypeScript
- **Banco/autenticação:** Supabase (Postgres + Auth + Row Level Security)
- **Hospedagem:** Netlify (deploy automático a cada push no GitHub)
- **Repositório:** público no GitHub (necessário no plano gratuito do
  Netlify pra reconhecer mais de um contribuidor Git). Nenhum segredo fica
  no código — chaves reais vivem só em `.env.local` (fora do Git) e nas
  variáveis de ambiente do Netlify.
- **Tema:** claro/escuro segue o sistema operacional por padrão; o botão de
  sol/lua no topo troca manualmente e fica salvo no navegador
  (`localStorage`). Toda animação respeita `prefers-reduced-motion`.
- **Avisos:** confirmações rápidas (nome salvo, acesso criado, cliente
  arquivado etc.) aparecem como toast no canto inferior direito — exceto
  senhas/credenciais reveladas, que ficam fixas na tela até serem copiadas.

## Como os dados são organizados

- `clients` — um registro por cliente (ex.: Samhia Simão).
- `profiles` — liga cada login do Supabase Auth a um papel (`staff` ou
  `client`) e, se for `client`, a um `client_id`.
- `feed_posts`, `stories_template`, `capture_guide` — o conteúdo de cada
  cliente, sempre amarrado a um `client_id`.
- `activity_log` — histórico de criação/edição/remoção nas três tabelas
  acima, gerado automaticamente por trigger (ninguém escreve nela direto).
  Só staff lê, na aba **Histórico** de cada cliente.

Regras de acesso (Row Level Security, já definidas em `supabase/schema.sql`):

| Quem | O que pode fazer |
|---|---|
| **staff** | Vê e edita tudo, de todos os clientes. Só staff pode criar cliente, adicionar/remover posts, dias de stories e itens de captação. |
| **client** | Vê e edita o **conteúdo** (tema, legenda, pilar, formato, data, status, textos) apenas do próprio cliente. Não pode criar nem remover linhas, nem ver outros clientes. |

---

## Passo a passo para colocar no ar

Você já tem conta no GitHub, Supabase e Netlify — o que falta é criar o
*projeto/repositório* em cada um. Siga nesta ordem:

### 1. Criar o projeto no Supabase

1. Em [supabase.com](https://supabase.com/dashboard), clique **New project**.
2. Escolha um nome (ex.: `cronograma-clientes`), uma senha de banco (guarde
   num lugar seguro — só o painel do Supabase usa essa senha, o app não
   precisa dela) e a região mais próxima.
3. Depois que o projeto terminar de subir, vá em **SQL Editor** (menu
   lateral) → **New query**, cole o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique **Run**.
4. Ainda no SQL Editor, rode também
   [`supabase/seed_samhia.sql`](supabase/seed_samhia.sql) — isso já cria a
   Samhia como primeiro cliente com o cronograma de agosto/2026 completo.
5. Vá em **Project Settings → API**. Copie:
   - **Project URL**
   - **anon public key**

   Essas duas informações não são secretas (o `anon key` é feito pra ficar no
   front-end) — mas ainda assim não fica público em nenhum lugar além do
   Netlify/`.env.local`.

### 2. Criar seu login de equipe (staff)

1. No Supabase, vá em **Authentication → Users → Add user** e crie seu
   usuário (e-mail + senha, marque "Auto Confirm User").
2. No **SQL Editor**, rode (trocando pelo seu e-mail):

   ```sql
   update public.profiles set role = 'staff'
   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```

Repita esse "Add user" pra cada pessoa da sua equipe que vai gerenciar
clientes.

### 3. Criar o login de cada cliente

Isso agora é feito direto pelo painel (aba **Acesso do Cliente**, dentro do
cronograma de cada cliente) — veja o passo 3B abaixo pra publicar a função
que faz isso antes de usar. O e-mail de login não precisa ser real (pode ser
algo tipo `samhia-simao@cronograma.local`) e a senha pode ser qualquer coisa,
inclusive sugerida automaticamente pelo painel.

### 3B. Publicar a função que cria os acessos (uma vez só)

1. No Supabase, vá em **Edge Functions** (menu lateral) → **Deploy a new
   function**.
2. Nome da função: `manage-client-access`.
3. Cole o conteúdo de
   [`supabase/functions/manage-client-access/index.ts`](supabase/functions/manage-client-access/index.ts)
   no editor e clique **Deploy**.

   Não precisa configurar nenhuma variável de ambiente — o Supabase já
   injeta `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente
   dentro da função.

Se seu projeto Supabase já existia antes dessa função (ex.: o projeto da
Samhia), volte ao **SQL Editor** e rode o `supabase/schema.sql` de novo —
é seguro rodar quantas vezes quiser, ele só adiciona o que ainda falta
(colunas novas, funções, etc).

### 3C. Avisos por e-mail (opcional)

O cronograma pode mandar e-mail automático quando um post muda de status,
e um resumo diário dos posts com data pra amanhã que ainda estão como
"planejado". Pra ativar:

1. Publique as duas funções extras do jeito do passo 3B: **Edge Functions
   → Deploy a new function**, uma chamada `notify-status-change` com o
   conteúdo de
   [`supabase/functions/notify-status-change/index.ts`](supabase/functions/notify-status-change/index.ts),
   outra chamada `notify-upcoming-posts` com o conteúdo de
   [`supabase/functions/notify-upcoming-posts/index.ts`](supabase/functions/notify-upcoming-posts/index.ts).
2. Crie uma conta grátis em [resend.com](https://resend.com) e gere uma API
   key.
3. No Supabase, vá em **Edge Functions → Manage secrets** (ou rode
   `supabase secrets set RESEND_API_KEY=sua-chave` pelo CLI) e adicione
   `RESEND_API_KEY` com o valor gerado.
4. Rode `supabase/schema.sql` no SQL Editor (de novo, é seguro) — isso cria
   o gatilho de mudança de status e agenda o job diário. As duas extensões
   que isso usa (`pg_net` e `pg_cron`) precisam estar habilitadas em
   **Database → Extensions**; se o passo der erro de extensão faltando,
   habilite as duas lá primeiro e rode de novo.
5. Em cada cliente, preencha o **e-mail de contato** na aba **Acesso do
   Cliente** (é um campo separado do e-mail de login, e esse precisa ser
   real — é pra onde os avisos vão).

Sem a `RESEND_API_KEY` configurada, o gatilho e o job diário continuam
rodando normalmente, mas não conseguem mandar e-mail — e isso **não** fica
em silêncio: a falha aparece na aba **Histórico** do cliente afetado,
destacada em vermelho.

### 4. Rodar localmente (opcional, pra testar antes de publicar)

```bash
npm install
cp .env.example .env.local
# edite .env.local com a Project URL e a anon key do passo 1
npm run dev
```

### 5. Subir para o GitHub

1. Em [github.com/new](https://github.com/new), crie um repositório vazio
   (sem README/gitignore, já temos os nossos) — por exemplo
   `cronograma-clientes`, privado.
2. Me avise a URL do repositório (algo como
   `https://github.com/seu-usuario/cronograma-clientes.git`) que eu configuro
   o remoto e faço o primeiro push.

### 6. Publicar no Netlify

1. Em [app.netlify.com](https://app.netlify.com), **Add new site → Import an
   existing project → Deploy with GitHub**, autorize e escolha o repositório
   que acabamos de criar.
2. O Netlify já vai detectar as configurações de build pelo
   [`netlify.toml`](netlify.toml) (comando `npm run build`, pasta `dist`).
3. Antes de clicar em **Deploy**, adicione em **Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (os mesmos valores do passo 1)
4. Clique **Deploy site**. A cada `git push`, o Netlify publica uma nova
   versão automaticamente.

### 6B. Testes automatizados e CI (opcional, mas recomendado)

Toda mudança nova (lint + build + testes de ponta a ponta) pode ser checada
automaticamente antes de ir pro ar, via GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Pra ativar:

1. Crie um login **staff dedicado só pra teste** (não uma pessoa real) —
   mesmo processo do passo 2, com um e-mail tipo `e2e-staff@seudominio.local`.
2. No GitHub, vá em **Settings → Secrets and variables → Actions → New
   repository secret** e adicione quatro secrets:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmos valores do passo 1)
   - `E2E_STAFF_EMAIL` e `E2E_STAFF_PASSWORD` (o login criado acima)
3. Pronto — a partir do próximo push, o GitHub Actions roda sozinho. Dá pra
   acompanhar na aba **Actions** do repositório.

Pra rodar a mesma suite localmente: preencha `E2E_STAFF_EMAIL` /
`E2E_STAFF_PASSWORD` no seu `.env.local` (veja `.env.example`) e rode
`npm run test:e2e`.

**Deploy de preview por Pull Request:** o Netlify já gera automaticamente
uma URL de teste pra cada Pull Request em repositórios conectados via
GitHub (normalmente já vem ligado — confirme em **Site configuration →
Build & deploy → Deploy contexts**). Isso só é útil se o fluxo de trabalho
usar Pull Requests em vez de `git push` direto na `main`; se preferir
continuar publicando direto, esse recurso fica ocioso, sem problema.

### 7. Adicionar um novo cliente depois

1. Faça login como staff e clique **Adicionar cliente** no painel — isso já
   cria a linha em `clients` com um slug.
2. (Opcional) No SQL Editor do Supabase, copie
   [`supabase/seed_new_client_template.sql`](supabase/seed_new_client_template.sql),
   troque `SLUG-DO-CLIENTE` pelo slug do novo cliente e ajuste os textos —
   isso pré-popula o guia de stories e a orientação de captação com o padrão
   que já usamos. Sem isso, o cliente começa com as abas vazias e dá pra
   preencher pelo próprio painel (botão **+ Novo dia** / **+ Novo item**).
3. Na aba **Acesso do Cliente** do cronograma desse cliente, crie o login
   dele — e-mail (pode ser fictício) e senha (pode digitar ou clicar em
   "Gerar outra"). Copie e envie as credenciais pro cliente, elas só
   aparecem na tela nesse momento.

---

## O que ainda não tem (próximos passos possíveis)

- Exportar como PDF de verdade (hoje só tem CSV — abre liso no Excel/Sheets).
