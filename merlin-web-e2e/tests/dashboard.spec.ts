import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from './support/api';

test('dashboard loads for a workspace', async ({ page }) => {
  const ws = 'e2e_dash_' + Date.now();
  await createWorkspace(ws);
  await page.goto(`/workspace/${ws}`);
  await expect(page.getByRole('heading', { name: ws })).toBeVisible();
  await expect(page.getByText('Workspace Dashboard').first()).toBeVisible();
  await deleteWorkspace(ws);
});
