import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace, importFasta } from './support/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, 'fixtures/genome.faa');

test('genes appear after importing a fasta genome', async ({ page }) => {
  const ws = 'e2e_genes_' + Date.now();
  await createWorkspace(ws);
  await importFasta(ws, '561', fixture, 'protein');

  await page.goto(`/workspace/${ws}/genes`);
  await expect(page.getByText('e2e_0001', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('e2e_0002', { exact: true }).first()).toBeVisible();

  await deleteWorkspace(ws);
});
