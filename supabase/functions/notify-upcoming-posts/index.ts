// Edge Function: notify-upcoming-posts
//
// Chamada uma vez por dia por um job do pg_cron (veja schema.sql). Varre
// posts com data de amanhã que ainda estão como "planejado" e manda um
// e-mail (um por cliente, com a lista) pro contact_email de cada um, via
// Resend.
//
// Mesmos segredos do notify-status-change: RESEND_API_KEY (obrigatório),
// RESEND_FROM (opcional). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm
// prontos automaticamente.

import { createClient } from 'npm:@supabase/supabase-js@2'

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

Deno.serve(async () => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)

  const { data: posts, error } = await admin
    .from('feed_posts')
    .select('tema, post_date, client_id, clients!inner(name, contact_email, archived_at)')
    .eq('post_date', tomorrowIso)
    .eq('status', 'planejado')

  if (error) return json({ error: error.message }, 500)
  if (!posts || posts.length === 0) return json({ sent: 0 })

  type Row = { tema: string; post_date: string; client_id: string; clients: { name: string; contact_email: string | null; archived_at: string | null } }
  const byClient = new Map<string, { name: string; email: string; items: Row[] }>()
  for (const row of posts as unknown as Row[]) {
    const c = row.clients
    if (!c?.contact_email || c.archived_at) continue
    if (!byClient.has(row.client_id)) byClient.set(row.client_id, { name: c.name, email: c.contact_email, items: [] })
    byClient.get(row.client_id)!.items.push(row)
  }

  let sent = 0
  const errors: string[] = []
  for (const [, group] of byClient) {
    const list = group.items.map((p) => `<li>${p.tema || '(sem tema)'}</li>`).join('')
    try {
      await sendEmail(
        group.email,
        `Cronograma ${group.name}: ${group.items.length} post(s) planejado(s) para amanhã`,
        `<p>Posts com data pra amanhã que ainda estão como "planejado":</p><ul>${list}</ul>`
      )
      sent++
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return json({ sent, errors })
})
