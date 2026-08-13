// Edge Function: notify-status-change
//
// Chamada por um trigger no banco (public.notify_status_change) sempre que
// o status de um feed_post muda. Manda um e-mail pro contact_email do
// cliente avisando da mudança, via Resend.
//
// Segredos necessários (Project Settings > Edge Functions > Secrets, ou
// `supabase secrets set`):
//   RESEND_API_KEY   — chave da API do Resend (obrigatória pra mandar e-mail)
//   RESEND_FROM      — opcional, remetente (padrão: onboarding@resend.dev)
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos automaticamente.

import { createClient } from 'npm:@supabase/supabase-js@2'

const STATUS_LABEL: Record<string, string> = {
  planejado: 'Planejado',
  gravado: 'Gravado',
  editado: 'Editado',
  postado: 'Postado',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY não configurado')
  const from = Deno.env.get('RESEND_FROM') || 'Cronograma <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`)
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let body: { post_id?: string; client_id?: string; old_status?: string; new_status?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido.' }, 400)
  }

  const { post_id, client_id, old_status, new_status } = body
  if (!post_id || !client_id || !new_status) return json({ error: 'Faltam dados.' }, 400)

  const [{ data: client }, { data: post }] = await Promise.all([
    admin.from('clients').select('name, contact_email').eq('id', client_id).maybeSingle(),
    admin.from('feed_posts').select('tema, post_date').eq('id', post_id).maybeSingle(),
  ])

  if (!client?.contact_email) return json({ skipped: 'sem contact_email' })

  const tema = post?.tema || '(sem tema)'
  const dataFmt = post?.post_date ? post.post_date.split('-').reverse().join('/') : ''
  const de = STATUS_LABEL[old_status ?? ''] ?? old_status ?? '—'
  const para = STATUS_LABEL[new_status] ?? new_status

  try {
    await sendEmail(
      client.contact_email,
      `Cronograma ${client.name}: post mudou para "${para}"`,
      `<p>O post <strong>${tema}</strong> (${dataFmt}) mudou de <strong>${de}</strong> para <strong>${para}</strong>.</p>`
    )
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Falha ao enviar e-mail.' }, 500)
  }

  return json({ ok: true })
})
