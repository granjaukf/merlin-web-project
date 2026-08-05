# Merlin Web — Testes E2E (design)

Data: 2026-08-05

## Objetivo

Desenvolver testes de integração end-to-end que validam os principais fluxos da interface web do Merlin. Estes testes servem como prova de qualidade para o estágio (relatório) e documentam o funcionamento dos fluxos principais: gestão de workspaces (incluindo uma nova operação de delete), dashboard, genes e reactions.

## Âmbito (duas partes)

1. **Nova feature**: operação real de eliminação de workspace (backend + frontend), necessária para os e2e se limparem e útil por si só.
2. **Testes e2e**: suíte Playwright que valida os fluxos principais.

## Contexto do sistema

- **Backend**: `merlin-web-api` — Java 17, framework Javalin, porta `8085`. Lê bases de dados H2 reais do Merlin (diretório configurado via `MERLIN_HOME`).
- **Frontend**: `merlin-web` — React 19 + Vite + TypeScript, dev server na porta `5173`, chama a API com `fetch` cru (`http://localhost:8085/api/...`).
- **MERLIN_HOME (fallback real)**: `/Users/granjaukf/Desktop/merlin-workspace/merlin-project/merlin-gui/target/merlin` — contém os BDs H2, incluindo o workspace `kegg`.

Atualmente não existe nenhuma suíte de testes no projeto web.

## Framework e estrutura

- **Playwright + TypeScript** num repositório separado: `merlin-web-e2e`.
- Motivos: relatório visual (screenshots/vídeo), suporte nativo a API testing (para teardown/cleanup), é a framework e2e mais comum.

```
merlin-web-e2e/
├── package.json
├── playwright.config.ts
├── .env                      # MERLIN_HOME, portas
├── .gitignore
├── src/
│   ├── fixtures/
│   │   └── genome.faa        # ficheiro FASTA de teste fixo
│   ├── support/              # helpers (criar/apagar workspace, etc.)
│   └── tests/
│       ├── workspaces.spec.ts
│       ├── dashboard.spec.ts
│       ├── genes.spec.ts
│       └── reactions.spec.ts
```

## Arranque dos serviços (Playwright webServer)

Configuração em `playwright.config.ts` usando a opção `webServer`:

- **Backend**: compila/corre `merlin-web-api` com `MERLIN_HOME` a apontar para o fallback real (via `.env`). O Playwright espera que `http://localhost:8085/api/workspaces` responda.
- **Frontend**: `npm run dev` (Vite). O Playwright espera que `http://localhost:5173` responda.

O Playwright lança ambos antes dos testes e termina-os no fim.

## Fluxos a cobrir

### 1. Workspaces (`workspaces.spec.ts`)
- Criar um workspace novo (via UI).
- Ver erro ao criar workspace com nome duplicado.
- Listar/abrir um workspace existente.

### 5. Delete workspace (`delete-workspace.spec.ts`)
- Criar um workspace de teste e apagá-lo via UI (confirmando com o nome digitado).
- Verificar que apagar um workspace protegido (ex. `kegg`) é recusado.

### 2. Dashboard (`dashboard.spec.ts`)
- Abrir um workspace e verificar que as estatísticas carregam (sem erro).

### 3. Genes (`genes.spec.ts`)
- Criar um workspace de teste único → importar FASTA local (fixture) → verificar que os genes aparecem.
- Fluxos de CRUD de genes: criar, editar, apagar, ver detalhes (magnifying glass).

### 4. Reactions (`reactions.spec.ts`)
- Abrir o workspace `kegg` (dados reais) e **só listar/verificar** reactions (filtro por pathway). Sem escrita no workspace `kegg`.

## Pré-requisito: operação real de "delete workspace" no Merlin

Para que os testes e2e se limparem sozinhos, adiciona-se uma operação real de eliminação de workspace — tanto no backend como no frontend — que também é uma feature útil por si só.

### Backend (`merlin-web-api`)

Novo endpoint `DELETE /api/workspaces/{name}` no `WorkspaceController`. Replica o padrão do GUI (`DropDatabase`):

1. `DatabaseServices.dropConnection(name)`
2. `DatabaseServices.dropDatabase(name)`
3. Apagar a pasta do workspace: `FileUtils.deleteDirectory(FileUtils.getWorkspaceFolderPath(name))`

**Proteção (whitelist):** o endpoint recusa apagar um conjunto de workspaces protegidos (configurável), para nunca destruir dados reais por engano. Workspaces protegidos por defeito: `kegg`, `gg`, `ecoli`, `ecoli_final`, `rhea`, `final`, `test`. A whitelist vive num ponto configurável no controller (ex. constante `Set<String> PROTECTED_WORKSPACES`).

- Se o workspace não existir → erro (ex. 404).
- Se o workspace estiver na whitelist → 403.
- Sucesso → 200 e o workspace deixa de aparecer em `GET /api/workspaces`.

### Frontend (`merlin-web`)

No painel de seleção de workspaces (`WorkspaceSelection.tsx`), adiciona-se um botão de apagar (ícone) junto de cada workspace existente. Fluxo:

- Clicar no botão de apagar abre um diálogo de confirmação que pede para **digitar o nome do workspace** por extenso para confirmar (modo mais seguro).
- Confirmação chama `DELETE /api/workspaces/{name}`.
- Em caso de erro (workspace protegido/inexistente), mostrar mensagem clara.
- Após sucesso, remover o workspace da lista exibida.

### Testes e2e do delete (novo ficheiro `delete-workspace.spec.ts`)

- Criar um workspace de teste e apagá-lo com sucesso via UI (confirmando com o nome).
- Verificar que um workspace protegido (ex. `kegg`) é recusado (não é apitado).

## Dados de teste e limpeza

- **Workspace de genes**: cada teste cria um workspace único (ex. `e2e_<timestamp>`) e importa o FASTA fixture. No **teardown**, o próprio teste apaga o workspace via o novo endpoint `DELETE /api/workspaces/{name}`. Assim, os testes deixam o estado limpo.
- **Workspace `kegg`**: apenas leitura salvo testes de proteção acima — nunca é escrito.
- **FASTA fixture**: ficheiro pequeno e fixo incluído no repositório.

## Robustez e gestão de erros

- `test.describe.configure({ retries: 2 })` para reduzir flakiness.
- Timeouts generosos (import FASTA e arranque do backend podem ser lentos na primeira execução).
- Se o backend não arrancar, o Playwright falha com log claro para diagnóstico.

## Critérios de aceitação

- `npx playwright test` arranca backend + frontend automaticamente.
- Todos os fluxos principais passam contra a instalação real do Merlin.
- Os testes deixam o estado limpo (workspace de teste apagado via novo endpoint, `kegg` inalterado).
- O delete de workspace é uma operação funcional: backend (`DELETE /api/workspaces/{name}`) com proteção de workspaces reais, e frontend com confirmação por digitação do nome.
- Geração de relatório (HTML) e screenshots para o relatório de estágio.
