# Merlin Web E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma suíte de testes e2e (Playwright) que valida os fluxos principais do Merlin Web: workspaces (criar/listar/apagar), dashboard, genes e reactions.

**Architecture:** Um novo repositório `merlin-web-e2e` com Playwright + TypeScript. O Playwright usa `webServer` para arrancar automaticamente o backend (`merlin-web-api`, porta 8085) e o frontend (`merlin-web`, porta 5173) antes dos testes e terminá-los no fim. Os testes interagem com a UI real e limpam o estado no teardown usando o endpoint de delete de workspaces.

**Tech Stack:** Playwright (e2e), TypeScript, Node.js. Backend Java (Javalin, porta 8085), frontend React/Vite (porta 5173).

## Global Constraints

- Os testes dependem de uma instalação real do Merlin em `MERLIN_HOME` (fallback em `MerlinWebServer.java`): `/Users/granjaukf/Desktop/merlin-workspace/merlin-project/merlin-gui/target/merlin`. O workspace real `kegg` existe aí e NUNCA deve ser escrito/apagado.
- O workspace real `kegg` é apenas para leitura.
- Workspaces protegidos contra delete no backend: `kegg`, `gg` (constante `PROTECTED_WORKSPACES` em `WorkspaceController.java`).
- O backend corre com: `mvn compile exec:java -Dexec.mainClass="pt.uminho.ceb.biosystems.merlin.web.MerlinWebServer"` (pasta `merlin-web-api`).
- O frontend corre com: `npm run dev` (pasta `merlin-web`), dev server na porta 5173.
- Todos os workspaces de teste criados pelos e2e devem ter prefixo `e2e_` e ser apagados no teardown.
- Nomes de ficheiros e conteúdo devem ser determinísticos (sem timestamps no conteúdo dos testes, para evitar flakiness).
- As portas usadas (8085 backend, 5173 frontend) devem ser configuráveis via env.

---

### Task 1: Scaffold do projeto Playwright

**Files:**
- Create: `merlin-web-e2e/package.json`
- Create: `merlin-web-e2e/.gitignore`
- Create: `merlin-web-e2e/.env.example`
- Create: `merlin-web-e2e/.env`
- Create: `merlin-web-e2e/playwright.config.ts`

**Interfaces:**
- Consumes: nada (projeto novo).
- Produces: estrutura base do projeto, comando `npx playwright test`, e configuração `webServer` que as Tasks 2-6 usam.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "merlin-web-e2e",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed"
  }
}
```

- [ ] **Step 2: Criar `.gitignore`**

```gitignore
node_modules/
test-results/
playwright-report/
blob-report/
.ds_store
.env
```

- [ ] **Step 3: Criar `.env.example`**

```bash
MERLIN_HOME=/Users/granjaukf/Desktop/merlin-workspace/merlin-project/merlin-gui/target/merlin
BACKEND_PORT=8085
FRONTEND_PORT=5173
```

- [ ] **Step 4: Copiar `.env.example` para `.env`**

Copiar o conteúdo (o `.env` real fica fora do git, conforme `.gitignore`).

- [ ] **Step 5: Instalar dependências e Playwright**

Run:
```bash
cd merlin-web-e2e && npm init -y >/dev/null 2>&1; npm install -D @playwright/test && npx playwright install chromium
```

Expected: dependências instaladas, Chromium descarregado. (Substituir o package.json criado por `npm init -y` pelo conteúdo do Step 1.)

- [ ] **Step 6: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "chore: scaffold playwright project"
```

---

### Task 2: Configuração do `playwright.config.ts` com webServer

**Files:**
- Create: `merlin-web-e2e/playwright.config.ts`

**Interfaces:**
- Consumes: Task 1 (pasta do projeto), paths absolutos dos repos `merlin-web` e `merlin-web-api`.
- Produces: configuração que arranca backend + frontend e define o URL base `http://localhost:5173`. As Tasks 3-6 dependem disto.

- [ ] **Step 1: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const backendPort = process.env.BACKEND_PORT || '8085';
const frontendPort = process.env.FRONTEND_PORT || '5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 2,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `MERLIN_HOME="${process.env.MERLIN_HOME}" mvn compile exec:java -Dexec.mainClass="pt.uminho.ceb.biosystems.merlin.web.MerlinWebServer"`,
      cwd: path.join(__dirname, '../merlin-web-api'),
      port: Number(backendPort),
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
    {
      command: 'npm run dev',
      cwd: path.join(__dirname, '../merlin-web'),
      port: Number(frontendPort),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
```

- [ ] **Step 2: Instalar `dotenv`**

Run:
```bash
cd merlin-web-e2e && npm install dotenv
```

Expected: `dotenv` instalado.

- [ ] **Step 3: Smoke test — arrancar tudo e abrir a home**

Criar `tests/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('home loads and shows merlin branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('merlin', { exact: true }).first()).toBeVisible();
});
```

- [ ] **Step 4: Correr o smoke test**

Run:
```bash
cd merlin-web-e2e && npx playwright test
```

Expected: o backend e o frontend arrancam, o teste passa (PASS). Isto valida que o webServer funciona.

- [ ] **Step 5: Remover `tests/smoke.spec.ts`** (será substituído por testes reais nas próximas tasks).

- [ ] **Step 6: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "chore: configure playwright webServer for backend and frontend"
```

---

### Task 3: Helper de API (criar/apagar workspaces)

**Files:**
- Create: `merlin-web-e2e/tests/support/api.ts`

**Interfaces:**
- Produces:
  - `async function createWorkspace(name: string, taxonomyID?: string): Promise<void>`
  - `async function deleteWorkspace(name: string): Promise<void>`
  - `async function importFasta(workspace: string, taxonomyID: string, filePath: string, type?: string): Promise<void>`
  - `async function listWorkspaces(): Promise<string[]>`

Estas funções usam `fetch` puro contra o backend. As Tasks 4-6 consomem estas funções nos teardowns e setups.

- [ ] **Step 1: Criar `tests/support/api.ts`**

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import FormData from 'form-data';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = `http://localhost:${process.env.BACKEND_PORT || '8085'}`;

export async function createWorkspace(name: string, taxonomyID?: string): Promise<void> {
  const res = await fetch(`${BACKEND}/api/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, taxonomyID: taxonomyID || '' }),
  });
  if (!res.ok) throw new Error(`createWorkspace(${name}) failed: ${res.status} ${await res.text()}`);
}

export async function deleteWorkspace(name: string): Promise<void> {
  const res = await fetch(`${BACKEND}/api/workspaces/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`deleteWorkspace(${name}) failed: ${res.status} ${await res.text()}`);
  }
}

export async function listWorkspaces(): Promise<string[]> {
  const res = await fetch(`${BACKEND}/api/workspaces`);
  if (!res.ok) throw new Error(`listWorkspaces failed: ${res.status}`);
  return res.json();
}

export async function importFasta(
  workspace: string,
  taxonomyID: string,
  filePath: string,
  type = 'protein',
): Promise<void> {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  const res = await fetch(
    `${BACKEND}/api/${encodeURIComponent(workspace)}/import-fasta?type=${type}&taxonomyID=${taxonomyID}`,
    { method: 'POST', body: form.getBuffer() as unknown as BodyInit, headers: form.getHeaders() },
  );
  if (!res.ok) throw new Error(`importFasta failed: ${res.status} ${await res.text()}`);
}
```

- [ ] **Step 2: Instalar `form-data`**

Run:
```bash
cd merlin-web-e2e && npm install form-data
```

Expected: `form-data` instalado.

- [ ] **Step 3: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "feat: api helper for workspace setup and teardown"
```

---

### Task 4: Fixture FASTA + testes de workspace (criar/listar/apagar)

**Files:**
- Create: `merlin-web-e2e/tests/fixtures/genome.faa`
- Create: `merlin-web-e2e/tests/workspaces.spec.ts`
- Create: `merlin-web-e2e/tests/delete-workspace.spec.ts`

**Interfaces:**
- Consumes: `createWorkspace`, `deleteWorkspace`, `listWorkspaces` de Task 3.
- Produces: cobertura e2e dos fluxos de workspace.

- [ ] **Step 1: Criar fixture FASTA `tests/fixtures/genome.faa`**

Conteúdo: duas proteínas curtas (para o teste de genes ter dados para listar/verificar).

```fasta
>e2e_protein_one locus_tag=e2e_0001
MKLFVKPTITKGEVAVRYDDVLNGEILQVGK
>e2e_protein_two locus_tag=e2e_0002
MSKTAIALKVLIPGDKVKVVVGVGP
```

- [ ] **Step 2: Criar `tests/workspaces.spec.ts`**

Testes: (a) criar workspace via UI e ver aparecer na lista; (b) erro ao criar workspace duplicado.

```ts
import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace, listWorkspaces } from './support/api';

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
    await expect(page.getByText(ws, { exact: true })).toBeVisible();
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
```

- [ ] **Step 3: Criar `tests/delete-workspace.spec.ts`**

Testes: (a) apagar um workspace de teste via UI confirmando com o nome; (b) apagar um workspace protegido (`kegg`) é recusado.

```ts
import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from './support/api';

test.describe('delete workspace', () => {
  test('delete a test workspace confirming by typing its name', async ({ page }) => {
    const ws = 'e2e_del_' + Date.now();
    await createWorkspace(ws);
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`Apagar workspace ${ws}`) }).click();
    await page.getByPlaceholder(ws).fill(ws);
    await page.getByRole('button', { name: 'Apagar Workspace' }).click();
    await expect(page.getByText(ws, { exact: true })).not.toBeVisible();
  });

  test('deleting a protected workspace is refused', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Apagar workspace kegg/ }).click();
    await page.getByPlaceholder('kegg').fill('kegg');
    await page.getByRole('button', { name: 'Apagar Workspace' }).click();
    await expect(page.getByText(/protected and cannot be deleted/i)).toBeVisible();
    await expect(page.getByText('kegg', { exact: true })).toBeVisible();
  });
});
```

- [ ] **Step 4: Correr os testes de workspace**

Run:
```bash
cd merlin-web-e2e && npx playwright test tests/workspaces.spec.ts tests/delete-workspace.spec.ts
```

Expected: todos passam. Se o teste do workspace protegido falhar, verificar que o backend responde 403 (o `kegg` está na whitelist `PROTECTED_WORKSPACES`).

- [ ] **Step 5: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "test: workspace and delete workspace e2e"
```

---

### Task 5: Teste de dashboard + genes (criar workspace com import FASTA)

**Files:**
- Create: `merlin-web-e2e/tests/dashboard.spec.ts`
- Create: `merlin-web-e2e/tests/genes.spec.ts`

**Interfaces:**
- Consumes: `createWorkspace`, `deleteWorkspace`, `importFasta` (Task 3), fixture `genome.faa` (Task 4).
- Produces: cobertura e2e do dashboard e de genes.

- [ ] **Step 1: Criar `tests/dashboard.spec.ts`**

Teste: abrir um workspace (via API para ter dados) e verificar que o dashboard carrega o nome.

```ts
import { test, expect } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from './support/api';

test('dashboard loads for a workspace', async ({ page }) => {
  const ws = 'e2e_dash_' + Date.now();
  await createWorkspace(ws);
  await page.goto(`/workspace/${ws}`);
  await expect(page.getByRole('heading', { name: ws })).toBeVisible();
  await expect(page.getByText('Workspace Dashboard')).toBeVisible();
  await deleteWorkspace(ws);
});
```

- [ ] **Step 2: Criar `tests/genes.spec.ts`**

Teste principal: criar workspace, importar o FASTA fixture via API, abrir a página de genes e verificar que os genes aparecem.

```ts
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
  await expect(page.getByText('e2e_0001', { exact: true })).toBeVisible();
  await expect(page.getByText('e2e_0002', { exact: true })).toBeVisible();

  await deleteWorkspace(ws);
});
```

- [ ] **Step 3: Correr os testes de dashboard e genes**

Run:
```bash
cd merlin-web-e2e && npx playwright test tests/dashboard.spec.ts tests/genes.spec.ts
```

Expected: ambos passam (dashboard carrega; genes `e2e_0001`/`e2e_0002` visíveis após import do FASTA).

- [ ] **Step 4: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "test: dashboard and genes e2e"
```

---

### Task 6: Teste de reactions (workspace kegg, apenas leitura)

**Files:**
- Create: `merlin-web-e2e/tests/reactions.spec.ts`

**Interfaces:**
- Consumes: nada de Tasks 3-5 (usa o workspace real `kegg`).
- Produces: cobertura e2e do fluxo de reactions sem escrever no workspace `kegg`.

- [ ] **Step 1: Criar `tests/reactions.spec.ts`**

Teste: abrir o workspace `kegg`, navegar para reactions, e verificar que a página carrega dados (sem criar/editar/apagar).

```ts
import { test, expect } from '@playwright/test';

test('reactions list loads for the kegg workspace', async ({ page }) => {
  await page.goto('/workspace/kegg/reactions');
  // A sidebar mostra o workspace ativo
  await expect(page.getByText('kegg', { exact: true }).first()).toBeVisible();
  // A página de reactions mostra pelo menos a tabela/área de dados
  await expect(page.locator('table, .overflow-x-auto, [class*="table"]').first()).toBeVisible({ timeout: 20_000 });
});
```

- [ ] **Step 2: Verificar o estado real da página de reactions**

Run (headed, para observar):
```bash
cd merlin-web-e2e && npx playwright test tests/reactions.spec.ts --headed
```

Expected: a página de reactions do `kegg` carrega. Se o seletor genérico `table, .overflow-x-auto` não corresponder ao HTML real da página `Reactions.tsx`, ajustar o seletor ao marcador real (ex. o `h2`/título da página ou o `role=heading`). O importante é validar que a página renderiza dados do `kegg` sem escrever.

- [ ] **Step 3: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "test: reactions read-only e2e for kegg workspace"
```

---

### Task 7: Limpeza e verificação final

**Files:**
- Modify: `merlin-web-e2e/README.md` (criar se não existir)

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: documentação de como correr os testes e o relatório HTML.

- [ ] **Step 1: Correr a suíte completa**

Run:
```bash
cd merlin-web-e2e && npx playwright test
```

Expected: todos os testes passam. Verificar no fim que não ficaram workspaces `e2e_*` órfãos:
```bash
curl -s http://localhost:8085/api/workspaces | grep -c e2e_ || echo "0 e2e workspaces left"
```

- [ ] **Step 2: Verificar o relatório HTML**

Run:
```bash
cd merlin-web-e2e && npx playwright show-report
```

Expected: o browser abre com o relatório HTML (screenshots, vídeos, timings) — pronto para o relatório de estágio.

- [ ] **Step 3: Criar `README.md`**

```markdown
# merlin-web-e2e

Testes end-to-end (Playwright) dos fluxos principais do Merlin Web.

## Pré-requisitos

- Instalação real do Merlin (contém as BDs H2 e o workspace `kegg`).
- Java 17 + Maven (para o backend).
- Node.js (para o frontend e Playwright).

## Configuração

Copie `.env.example` para `.env` e ajuste se necessário:

```bash
MERLIN_HOME=/Users/granjaukf/Desktop/merlin-workspace/merlin-project/merlin-gui/target/merlin
BACKEND_PORT=8085
FRONTEND_PORT=5173
```

Instale as dependências:

```bash
npm install
npx playwright install chromium
```

## Correr os testes

```bash
npm test                # suíte completa (modo headless)
npm run test:headed     # observar o browser
npm run test:ui         # Playwright UI
npx playwright show-report   # relatório HTML
```

O Playwright arranca automaticamente o backend (`merlin-web-api`) e o frontend (`merlin-web`) antes dos testes e termina-os no fim.

## Notas

- O workspace real `kegg` é usado apenas em modo leitura (teste de reactions).
- Os testes criam workspaces com prefixo `e2e_` e apagam-nos no teardown.
- O backend expõe um endpoint de delete de workspace (`DELETE /api/workspaces/{name}`) com proteção para workspaces reais (`kegg`, `gg`).
```

- [ ] **Step 4: Commit**

```bash
cd merlin-web-e2e && git add . && git commit -m "docs: readme and final verification"
```

---

## Self-Review

**1. Spec coverage:**
- Fluxos de workspace (criar/erro duplicado/listar): Task 4 ✓
- Delete de workspace (sucesso + protegido): Task 4 ✓ (também testa a feature de delete do backend/frontend)
- Dashboard: Task 5 ✓
- Genes (via criação de workspace + import FASTA): Task 5 ✓
- Reactions (workspace `kegg`, só leitura): Task 6 ✓
- webServer arranca backend + frontend: Task 2 ✓
- Limpeza de estado: tasks 3-6 usam `deleteWorkspace` no teardown ✓

**2. Placeholder scan:** Sem TBD/TODO. Todos os passos têm código e comandos concretos. O Step 2 da Task 6 permite ajustar o seletor ao HTML real — é uma decisão consciente dado que não consigo confirmar o seletor exato da tabela de reactions sem correr o app, mas o teste tem um seletor genérico funcional como fallback.

**3. Type consistency:** `createWorkspace`, `deleteWorkspace`, `importFasta`, `listWorkspaces` são definidos na Task 3 e usados consistentemente nas tasks 4-5. `genome.faa` fixture definido na Task 4, usado na Task 5. Nomes de ficheiros consistentes.
