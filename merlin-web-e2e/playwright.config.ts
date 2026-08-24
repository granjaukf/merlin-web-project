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
      command: `npm run dev -- --port ${frontendPort} --strictPort`,
      cwd: path.join(__dirname, '../merlin-web'),
      port: Number(frontendPort),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
