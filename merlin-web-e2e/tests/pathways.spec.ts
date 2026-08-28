import { test, expect } from '@playwright/test';

test.describe('pathways', () => {
  test('table loads for kegg workspace', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('heading', { name: 'Pathways for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('search filters pathways', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });

    const countBefore = await page.locator('tbody tr').count();
    const firstRow = page.locator('tbody tr').first();
    const name = (await firstRow.locator('td').nth(2).innerText()).trim();
    const code = (await firstRow.locator('td').nth(1).innerText()).trim();
    const searchTerm = name !== '-' && name !== '' ? name : code;

    await page.getByPlaceholder('Search by name or code').fill(searchTerm);
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const countAfter = await page.locator('tbody tr').count();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(countAfter).toBeGreaterThanOrEqual(1);
  });

  test('stats tab loads', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('heading', { name: 'Pathways for kegg' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByText('Total Pathways')).toBeVisible({ timeout: 10_000 });
  });

  test('detail modal opens', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });

    await page.locator('button[title="View Details"]').first().click();
    await expect(page.getByText('Pathway Data')).toBeVisible({ timeout: 10_000 });
  });
});