import { createClient } from '@supabase/supabase-js'
import { test as base, type Page } from '@playwright/test'

/** Aceita automaticamente qualquer confirm() nativo (usado em arquivar/remover). */
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('dialog', (d) => d.accept())
    await use(page)
  },
})
export { expect } from '@playwright/test'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Faltou a variável de ambiente ${name} (necessária pros testes E2E).`)
  return value
}

export async function loginAsStaff(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', requireEnv('E2E_STAFF_EMAIL'))
  await page.fill('input[type="password"]', requireEnv('E2E_STAFF_PASSWORD'))
  await page.click('button[type="submit"]')
  await page.waitForSelector('text=Clientes', { timeout: 15000 })
}

/** Nome já em formato de slug (minúsculo, hífens) — evita ter que recalcular o slug depois. */
export function uniqueClientSlug(prefix: string) {
  return `e2e-${prefix}-${Date.now()}`
}

/** Remove um cliente de teste direto pelo banco (staff pode deletar via RLS), sem depender de UI. */
export async function deleteTestClient(slug: string) {
  const supabase = createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('VITE_SUPABASE_ANON_KEY'))
  await supabase.auth.signInWithPassword({
    email: requireEnv('E2E_STAFF_EMAIL'),
    password: requireEnv('E2E_STAFF_PASSWORD'),
  })
  await supabase.from('clients').delete().eq('slug', slug)
}
