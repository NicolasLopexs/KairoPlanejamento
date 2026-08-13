// Edge Function: manage-client-access
//
// Permite que um login "staff" crie, redefina senha, realoque ou remova o
// acesso de login de um cliente ao próprio cronograma — tudo pelo painel,
// sem precisar entrar no Supabase Dashboard.
//
// Deploy (uma vez só, pelo navegador, sem precisar de linha de comando):
//   Supabase Dashboard > Edge Functions > Deploy a new function
//   nome: manage-client-access
//   cole o conteúdo deste arquivo > Deploy
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos no ambiente da
// função automaticamente — não precisa configurar nada a mais.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return json({ error: 'Não autenticado.' }, 401)

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !callerData.user) return json({ error: 'Não autenticado.' }, 401)

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  if (callerProfile?.role !== 'staff') {
    return json({ error: 'Só a equipe pode gerenciar acessos de clientes.' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  try {
    switch (body.action) {
      case 'create': {
        const email = String(body.email ?? '').trim()
        const password = String(body.password ?? '')
        const client_id = String(body.client_id ?? '')
        const full_name = body.full_name ? String(body.full_name) : null
        if (!email || !password || !client_id) {
          return json({ error: 'Preencha e-mail, senha e cliente.' }, 400)
        }

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        })
        if (createErr || !created.user) {
          return json({ error: createErr?.message ?? 'Falha ao criar acesso.' }, 400)
        }

        const { error: profileErr } = await admin
          .from('profiles')
          .update({ role: 'client', client_id, full_name, email })
          .eq('id', created.user.id)
        if (profileErr) return json({ error: profileErr.message }, 400)

        return json({ id: created.user.id, email })
      }

      case 'reset_password': {
        const user_id = String(body.user_id ?? '')
        const password = String(body.password ?? '')
        if (!user_id || !password) return json({ error: 'Faltam dados.' }, 400)
        const { error } = await admin.auth.admin.updateUserById(user_id, { password })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'relink': {
        const user_id = String(body.user_id ?? '')
        const client_id = String(body.client_id ?? '')
        if (!user_id || !client_id) return json({ error: 'Faltam dados.' }, 400)
        const { error } = await admin.from('profiles').update({ client_id }).eq('id', user_id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'delete': {
        const user_id = String(body.user_id ?? '')
        if (!user_id) return json({ error: 'Faltam dados.' }, 400)
        const { error } = await admin.auth.admin.deleteUser(user_id)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      default:
        return json({ error: 'Ação desconhecida.' }, 400)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado.' }, 500)
  }
})
