import { test, expect, loginAsStaff, uniqueClientSlug, deleteTestClient } from './helpers'

test('marcar post pra revisar mostra selo e conta nos números', async ({ page }) => {
  const slug = uniqueClientSlug('review')

  await loginAsStaff(page)
  await page.fill('.new-client-form input[type="text"]', slug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await page.click(`.client-tile-link:has-text("${slug}")`)
  await page.click('.feed-toolbar-actions button:has-text("Novo post")')
  await page.waitForSelector('.card')

  await page.click('.review-toggle')
  await expect(page.locator('.review-badge')).toBeVisible()
  await expect(page.locator('.stat-tile-review .stat-num')).toHaveText('1')

  await page.click('.review-toggle')
  await expect(page.locator('.review-badge')).toHaveCount(0)

  await deleteTestClient(slug)
})

test('busca global encontra cliente pelo nome no painel', async ({ page }) => {
  const slug = uniqueClientSlug('search')

  await loginAsStaff(page)
  await page.fill('.new-client-form input[type="text"]', slug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await expect(page.locator('.client-tile', { hasText: slug })).toBeVisible()

  await page.fill('.dashboard-toolbar .filter-search', 'texto-que-nao-bate-em-nenhum-cliente')
  await expect(page.locator('.client-tile', { hasText: slug })).toHaveCount(0)

  await page.fill('.dashboard-toolbar .filter-search', slug)
  await expect(page.locator('.client-tile', { hasText: slug })).toBeVisible()

  await deleteTestClient(slug)
})

test('duplicar guia de stories de outro cliente', async ({ page }) => {
  const sourceSlug = uniqueClientSlug('dup-origem')
  const targetSlug = uniqueClientSlug('dup-destino')

  await loginAsStaff(page)

  // cria o cliente de origem com um dia no guia de stories
  await page.fill('.new-client-form input[type="text"]', sourceSlug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await page.click(`.client-tile-link:has-text("${sourceSlug}")`)
  await page.click('button:has-text("Guia — Stories")')
  await page.click('.duplicate-row button:has-text("Novo dia")')
  await page.waitForSelector('.story-card')

  // cria o cliente de destino e duplica de lá
  await page.goto('/')
  await page.fill('.new-client-form input[type="text"]', targetSlug)
  await page.click('.new-client-form button:has-text("Adicionar cliente")')
  await page.click(`.client-tile-link:has-text("${targetSlug}")`)
  await page.click('button:has-text("Guia — Stories")')
  await page.selectOption('.duplicate-select', { label: sourceSlug })
  await page.click('button:has-text("Duplicar guia")')
  await expect(page.locator('.story-card')).toHaveCount(1, { timeout: 10000 })

  await deleteTestClient(sourceSlug)
  await deleteTestClient(targetSlug)
})
