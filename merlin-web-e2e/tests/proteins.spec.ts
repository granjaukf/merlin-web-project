import { test, expect } from '@playwright/test';

test.describe('proteins (kegg)', () => {
  test('table loads and shows protein data', async ({ page }) => {
    await page.goto('/workspace/kegg/proteins');
    await expect(page.getByRole('heading', { name: 'Proteins for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('search filters proteins', async ({ page }) => {
    await page.goto('/workspace/kegg/proteins');
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });

    const countBefore = await page.locator('tbody tr').count();
    const firstRow = page.locator('tbody tr').first();
    const firstName = await firstRow.locator('td').nth(1).innerText();

    await page.getByPlaceholder('Search by name').fill(firstName);
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const countAfter = await page.locator('tbody tr').count();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(countAfter).toBeGreaterThanOrEqual(1);
  });

  test('stats tab loads', async ({ page }) => {
    await page.goto('/workspace/kegg/proteins');
    await expect(page.getByRole('heading', { name: 'Proteins for kegg' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByText('Number of proteins')).toBeVisible({ timeout: 10_000 });
  });

  test('detail modal opens', async ({ page }) => {
    await page.goto('/workspace/kegg/proteins');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });

    await page.locator('button[title="View Details"]').first().click();
    await expect(page.getByText('Protein Data')).toBeVisible({ timeout: 10_000 });
  });
});
