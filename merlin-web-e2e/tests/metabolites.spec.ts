import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from './support/api';

test.describe('metabolites', () => {
  test('table loads for kegg workspace', async ({ page }) => {
    await page.goto('/workspace/kegg/metabolites');
    await expect(page.getByRole('heading', { name: 'Metabolites for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('stats tab loads', async ({ page }) => {
    await page.goto('/workspace/kegg/metabolites');
    await expect(page.getByRole('heading', { name: 'Metabolites for kegg' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByRole('heading', { name: 'Reactants', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('insert modal opens on fresh workspace', async ({ page }) => {
    const ws = 'e2e_met_insert_' + Date.now();
    await createWorkspace(ws);

    await page.goto(`/workspace/${ws}/metabolites`);
    await expect(page.getByRole('heading', { name: `Metabolites for ${ws}` })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Insert Metabolite' }).click();
    await expect(page.getByPlaceholder('e.g. Pyruvate')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Insert', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await deleteWorkspace(ws);
  });
});
