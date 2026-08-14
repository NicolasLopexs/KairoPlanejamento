import { test, expect, loginAsStaff } from './helpers'

test('login com credenciais inválidas mostra erro', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'nao-existe@cronograma.local')
  await page.fill('input[type="password"]', 'senha-completamente-errada')
  await page.click('button[type="submit"]')
  await expect(page.locator('.form-error')).toHaveText('E-mail ou senha incorretos.')
})

test('login válido leva pro painel de clientes', async ({ page }) => {
  await loginAsStaff(page)
  await expect(page.locator('h1')).toHaveText('Clientes')
})
