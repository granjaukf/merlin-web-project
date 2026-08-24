import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from './support/api';

const base = 'e2e_ws_';

test.describe('workspaces', () => {
  test('create a workspace via UI and see it in the list', async ({ page }) => {
    const ws = base + Date.now();
    await page.goto('/');
    await page.getByRole('button', { name: 'New Workspace' }).click();
    await page.getByPlaceholder('e.g. ecoli_model').fill(ws);
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/workspace/${ws}`));
    await page.getByText('Change Workspace').click();
    await expect(page.getByText(ws, { exact: true }).first()).toBeVisible();
    await deleteWorkspace(ws);
  });

  test('duplicate workspace name shows error', async ({ page }) => {
    const ws = base + Date.now();
    await createWorkspace(ws);
    await page.goto('/');
    await page.getByRole('button', { name: 'New Workspace' }).click();
    await page.getByPlaceholder('e.g. ecoli_model').fill(ws);
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
    await deleteWorkspace(ws);
  });
});
