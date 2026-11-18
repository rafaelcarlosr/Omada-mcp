import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createPortTagOpenApiVO03Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createPortTagOpenApiVO03Schema.describe('Switch port label (official CreatePortTagOpenApiVO): name, 1 to 128 ASCII characters.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSwitchPortTag' | 'listSwitchPortTags'>;

export function registerCreateSwitchPortTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSwitchPortTag',
        {
            description:
                'Create a switch port label that can then be attached to ports. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSwitchPortTag',
            mutationSummary('create-switch-port-tag', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'switch port label', list: () => client.listSwitchPortTags(siteId, customHeaders), idKeys: ['tagId'] },
                    payload,
                    dryRun,
                    write: () => client.createSwitchPortTag(payload, siteId, customHeaders),
                })
        )
    );
}
