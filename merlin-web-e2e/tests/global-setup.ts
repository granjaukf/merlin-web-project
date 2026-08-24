import fs from 'node:fs';
import path from 'node:path';

async function globalSetup() {
  const merlinHome = process.env.MERLIN_HOME;
  if (!merlinHome) return;

  const h2Dir = path.join(merlinHome, 'h2Database');
  if (!fs.existsSync(h2Dir)) return;

  for (const file of fs.readdirSync(h2Dir)) {
    if (file.startsWith('e2e_')) {
      fs.rmSync(path.join(h2Dir, file), { force: true });
      console.log(`[setup] removed stale test artifact ${file}`);
    }
  }
}

export default globalSetup;
