import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { scenario02Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: scenario02Schema.describe('Scenario (official Scenario): name of 1-128 visible ASCII characters.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createScenario' | 'listScenarios'>;

export function registerCreateScenarioTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createScenario',
        {
            description:
                'Create a custom site scenario (a label such as "Warehouse" chosen when creating or editing sites). Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createScenario',
            mutationSummary('create-scenario', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'scenario', list: () => client.listScenarios(customHeaders), idKeys: ['name'] },
                    payload,
                    dryRun,
                    write: () => client.createScenario(payload.name, customHeaders),
                })
        )
    );
}
