import { listWorkspaces, deleteWorkspace } from './support/api';

async function globalTeardown() {
  try {
    const workspaces = await listWorkspaces();
    for (const name of workspaces) {
      if (name.startsWith('e2e_')) {
        await deleteWorkspace(name);
        console.log(`[teardown] deleted leftover workspace ${name}`);
      }
    }
  } catch {
    console.log('[teardown] backend unreachable, skipping workspace sweep');
  }
}

export default globalTeardown;
