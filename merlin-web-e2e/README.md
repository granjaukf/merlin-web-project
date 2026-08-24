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
FRONTEND_PORT=5174
```

> Nota: o frontend usa `FRONTEND_PORT` com `--strictPort`. Se a porta estiver ocupada por outra app, os testes falham de imediato em vez de testarem contra a aplicação errada. O valor 5174 evita conflito com outros dev servers Vite na máquina.

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

## Fluxos cobertos

- **Workspaces**: criar via UI, erro com nome duplicado.
- **Delete workspace**: apagar com confirmação por digitação; recusa de workspaces protegidos (`kegg`, `gg`).
- **Dashboard**: carregamento com o nome do workspace.
- **Genes**: import FASTA via API → genes visíveis na tabela.
- **Reactions**: leitura do workspace real `kegg` (sem escrita).

## Notas

- O workspace real `kegg` é usado apenas em modo leitura (teste de reactions).
- Os testes criam workspaces com prefixo `e2e_` e apagam-nos no teardown.
- O backend expõe um endpoint de delete de workspace (`DELETE /api/workspaces/{name}`) com proteção para workspaces reais (`kegg`, `gg`) — constante `PROTECTED_WORKSPACES` em `WorkspaceController.java`.
- A fixture `tests/fixtures/genome.faa` usa cabeçalhos simples: o parser do Merlin usa o primeiro token do header FASTA como locus tag.
