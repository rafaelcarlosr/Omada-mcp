import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ipMacBindingPayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    bindId: z.string().trim().min(1).describe('IP-MAC binding ID from getGridIpMacBinding.'),
    payload: ipMacBindingPayloadSchema.describe('Complete IP-MAC binding (official IPMacBinding).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridIpMacBinding' | 'updateIpMacBinding'>;

export function registerUpdateIpMacBindingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateIpMacBinding',
        {
            description:
                'Replace an IP-MAC binding. The controller needs the complete binding; fields left out, such as the description, are cleared. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateIpMacBinding',
            mutationSummary('update-ip-mac-binding', (args) => String(args.bindId)),
            async ({ bindId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'IP-MAC binding',
                        list: () => client.getGridIpMacBinding(1, 1000, siteId, customHeaders),
                        nameKey: null,
                    },
                    id: bindId,
                    payload,
                    dryRun,
                    write: () => client.updateIpMacBinding(bindId, payload, siteId, customHeaders),
                    warnings: ['With IP-MAC binding enforcement on, a device using this IP with another MAC loses access.'],
                })
        )
    );
}
