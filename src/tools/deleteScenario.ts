import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    name: z.string().trim().min(1).max(128).describe('Name of a custom scenario from listScenarios.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteScenario' | 'listScenarios'>;

export function registerDeleteScenarioTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteScenario',
        {
            description:
                'Delete a custom site scenario. Built-in scenarios are refused, and the controller refuses scenarios still used by a site. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteScenario',
            mutationSummary('delete-scenario', (args) => String(args.name)),
            async ({ name, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'scenario', list: () => client.listScenarios(customHeaders), idKeys: ['name'] },
                    id: name,
                    dryRun,
                    guard: (scenario) => {
                        if (scenario.isDefault === true)
                            throw new Error(`"${name}" is a built-in scenario and cannot be deleted. No request was sent.`);
                    },
                    write: () => client.deleteScenario(name, customHeaders),
                })
        )
    );
}
