import { test, expect } from '@playwright/test';
import { createWorkspace } from './support/api';

test.describe('delete workspace', () => {
  test('delete a test workspace confirming by typing its name', async ({ page }) => {
    const ws = 'e2e_del_' + Date.now();
    await createWorkspace(ws);
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`Apagar workspace ${ws}`) }).click();
    await page.getByPlaceholder(ws).fill(ws);
    await page.getByRole('button', { name: 'Apagar Workspace', exact: true }).click();
    await expect(page.getByRole('main').getByText(ws, { exact: true })).toHaveCount(0, { timeout: 30_000 });
  });

  test('deleting a protected workspace is refused', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Apagar workspace kegg/ }).click();
    await page.getByPlaceholder('kegg').fill('kegg');
    await page.getByRole('button', { name: 'Apagar Workspace', exact: true }).click();
    await expect(page.getByText(/protected and cannot be deleted/i)).toBeVisible();
    await expect(page.getByText('kegg', { exact: true }).first()).toBeVisible();
  });
});
