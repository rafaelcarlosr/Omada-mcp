import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    bindId: z.string().trim().min(1).describe('IP-MAC binding ID from getGridIpMacBinding.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIpMacBinding' | 'getGridIpMacBinding'>;

export function registerDeleteIpMacBindingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIpMacBinding',
        {
            description: 'Delete an IP-MAC binding. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIpMacBinding',
            mutationSummary('delete-ip-mac-binding', (args) => String(args.bindId)),
            async ({ bindId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'IP-MAC binding',
                        list: () => client.getGridIpMacBinding(1, 1000, siteId, customHeaders),
                        nameKey: null,
                    },
                    id: bindId,
                    dryRun,
                    write: () => client.deleteIpMacBinding(bindId, siteId, customHeaders),
                    warnings: ['The binding stops protecting this IP address.'],
                })
        )
    );
}
