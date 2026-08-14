import { test, expect, loginAsStaff, uniqueClientSlug, deleteTestClient } from './helpers'

test('bloqueia senha curta e cria acesso de cliente com senha válida', async ({ page }) => {
  const slug = uniqueClientSlug('access')

  await loginAsStaff(page)
  await page.fill('.new-client-form input[type="text"]', slug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await page.click(`.client-tile-link:has-text("${slug}")`)
  await page.click('button:has-text("Acesso do Cliente")')
  await page.waitForSelector('.access-form')

  await page.fill('.password-field input', '123')
  await page.click('.access-form button:has-text("Criar acesso")')
  await expect(page.locator('text=A senha precisa ter pelo menos 6 caracteres.')).toBeVisible()

  await page.fill('.password-field input', 'SenhaValida123')
  await page.click('.access-form button:has-text("Criar acesso")')
  await expect(page.locator('text=Acesso criado!')).toBeVisible({ timeout: 15000 })

  await page.click('.access-row button:has-text("Remover")')
  await expect(page.locator('.access-row')).toHaveCount(0)

  await deleteTestClient(slug)
})
