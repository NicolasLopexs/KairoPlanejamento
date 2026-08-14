import { test, expect, loginAsStaff, uniqueClientSlug, deleteTestClient } from './helpers'

test('criar post, mudar pilar/status, filtrar e buscar', async ({ page }) => {
  const slug = uniqueClientSlug('feed')

  await loginAsStaff(page)
  await page.fill('.new-client-form input[type="text"]', slug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await page.click(`.client-tile-link:has-text("${slug}")`)
  await page.waitForSelector('text=Cronograma — Feed')

  await expect(page.locator('.empty-state')).toBeVisible()

  await page.click('.feed-toolbar-actions button:has-text("Novo post")')
  await page.waitForSelector('.card')
  await page.selectOption('.card .pillar-select', 'Lifestyle')
  await expect(page.locator('.card .pillar-select.select-flash')).toHaveCount(1)

  // filtro por pilar esconde o post quando o pilar é desmarcado
  await page.click('.legend .chip-toggle:has-text("Lifestyle")')
  await expect(page.locator('.card')).toHaveCount(0)
  await page.click('.legend .chip-toggle:has-text("Lifestyle")')
  await expect(page.locator('.card')).toHaveCount(1)

  // busca por texto que não existe mostra o estado vazio de filtro
  await page.fill('.filter-search', 'texto-que-nao-deve-bater-em-nada')
  await expect(page.locator('text=Nenhum post encontrado')).toBeVisible()

  await deleteTestClient(slug)
})
