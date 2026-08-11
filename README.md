# Cronograma de Clientes

Painel para gerenciar cronogramas de postagem (feed, stories e orientações de
captação) de vários clientes, com login separado para a equipe e para cada
cliente.

- **Front-end:** Vite + React + TypeScript
- **Banco/autenticação:** Supabase (Postgres + Auth + Row Level Security)
- **Hospedagem:** Netlify (deploy automático a cada push no GitHub)

## Como os dados são organizados

- `clients` — um registro por cliente (ex.: Samhia Simão).
- `profiles` — liga cada login do Supabase Auth a um papel (`staff` ou
  `client`) e, se for `client`, a um `client_id`.
- `feed_posts`, `stories_template`, `capture_guide` — o conteúdo de cada
  cliente, sempre amarrado a um `client_id`.

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

### 3. Criar o login da Samhia (ou de outro cliente)

1. **Authentication → Users → Add user**, com o e-mail da Samhia.
2. No **SQL Editor**:

   ```sql
   update public.profiles set role = 'client',
     client_id = (select id from public.clients where slug = 'samhia-simao')
   where id = (select id from auth.users where email = 'email-da-samhia@exemplo.com');
   ```

Ela poderá então entrar com esse e-mail/senha e ver só o cronograma dela.

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

### 7. Adicionar um novo cliente depois

1. Faça login como staff e clique **Adicionar cliente** no painel — isso já
   cria a linha em `clients` com um slug.
2. (Opcional) No SQL Editor do Supabase, copie
   [`supabase/seed_new_client_template.sql`](supabase/seed_new_client_template.sql),
   troque `SLUG-DO-CLIENTE` pelo slug do novo cliente e ajuste os textos —
   isso pré-popula o guia de stories e a orientação de captação com o padrão
   que já usamos. Sem isso, o cliente começa com as abas vazias e dá pra
   preencher pelo próprio painel (botão **+ Novo dia** / **+ Novo item**).
3. Repita o passo 3 acima ("Criar o login do cliente") se quiser dar acesso
   de login pra esse cliente ver/editar o próprio cronograma.

---

## O que ainda não tem (próximos passos possíveis)

- Fluxo de convite de usuário pela própria interface (hoje é feito pelo
  painel do Supabase).
- Exportar/baixar o cronograma como planilha ou PDF.
- Histórico de alterações / quem editou o quê.
