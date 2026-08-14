import { test, expect, loginAsStaff, uniqueClientSlug, deleteTestClient } from './helpers'

test('criar, arquivar, reativar e remover um cliente', async ({ page }) => {
  const slug = uniqueClientSlug('lifecycle')

  await loginAsStaff(page)

  await page.fill('.new-client-form input[type="text"]', slug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  const tile = page.locator('.client-tile', { hasText: slug })
  await expect(tile).toBeVisible()

  await tile.locator('button:has-text("Arquivar")').click()
  await expect(tile).not.toBeVisible()

  await page.click('button:has-text("Ver arquivados")')
  const archivedTile = page.locator('.client-tile', { hasText: slug })
  await expect(archivedTile).toBeVisible()

  await archivedTile.locator('button:has-text("Reativar")').click()
  await page.click('button:has-text("Ver clientes ativos")')
  await expect(page.locator('.client-tile', { hasText: slug })).toBeVisible()

  await deleteTestClient(slug)
})
