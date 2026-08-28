import { test, expect } from '@playwright/test';

test.describe('reaction detail', () => {
  test('detail modal opens and shows real data', async ({ page }) => {
    await page.goto('/workspace/kegg/reactions');
    await expect(page.getByRole('heading', { name: 'Reactions for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await page.locator('button[title="View Detailed Info"]').first().click();
    await expect(page.getByText('Reaction Data')).toBeVisible({ timeout: 10_000 });

    const modal = page.locator('div.fixed.inset-0');

    // Enzymes tab should show real data (heading + EC badge or empty state)
    await page.getByRole('button', { name: 'enzymes' }).click();
    await expect(modal.getByText('Associated Enzymes & EC Numbers')).toBeVisible({ timeout: 10_000 });

    // Synonyms tab
    await page.getByRole('button', { name: 'synonyms' }).click();
    await expect(modal.getByText('Synonyms', { exact: true })).toBeVisible();

    // Source tab
    await page.getByRole('button', { name: 'source' }).click();
    await expect(modal.getByText('Source Annotation')).toBeVisible();
  });
});