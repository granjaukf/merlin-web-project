import { test, expect } from '@playwright/test';

test('reactions list loads for the kegg workspace', async ({ page }) => {
  await page.goto('/workspace/kegg/reactions');
  // A sidebar mostra o workspace ativo
  await expect(page.getByText('kegg', { exact: true }).first()).toBeVisible();
  // A página de reactions mostra o título real e a tabela de dados
  await expect(page.getByRole('heading', { name: 'Reactions for kegg' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('table').first()).toBeVisible();
});
