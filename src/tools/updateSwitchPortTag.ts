import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { createPortTagOpenApiVO03Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tagId: z.string().trim().min(1).describe('Port label ID (tagId) from listSwitchPortTags.'),
    payload: createPortTagOpenApiVO03Schema.describe('New label name, 1 to 128 ASCII characters.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSwitchPortTags' | 'updateSwitchPortTag'>;

export function registerUpdateSwitchPortTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSwitchPortTag',
        {
            description:
                'Rename a switch port label; ports that use it keep it. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSwitchPortTag',
            mutationSummary('update-switch-port-tag', (args) => String(args.tagId)),
            async ({ tagId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: { label: 'switch port label', list: () => client.listSwitchPortTags(siteId, customHeaders), idKeys: ['tagId'] },
                    id: tagId,
                    payload,
                    dryRun,
                    write: () => client.updateSwitchPortTag({ tagId, ...payload }, siteId, customHeaders),
                })
        )
    );
}
