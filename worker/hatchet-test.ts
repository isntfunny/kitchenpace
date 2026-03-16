import 'dotenv/config';

import { hatchet } from './hatchet';
import { helloWorldWorkflow } from './workflows/hello-world';

async function main() {
    console.log('[Test] Starting Hatchet test worker...');

    const worker = await hatchet.worker('kitchenpace-test');
    await worker.registerWorkflows([helloWorldWorkflow]);

    console.log('[Test] Workflow registered, starting worker...');
    await worker.start();
}

main().catch((error) => {
    console.error('[Test] Failed:', error);
    process.exit(1);
});
