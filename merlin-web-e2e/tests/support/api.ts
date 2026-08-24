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
