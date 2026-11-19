import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { newIPSAllowListEntrySchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allowEntryRequest, allPages, checkAllowEntry } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: newIPSAllowListEntrySchema.describe(
        'Allow list entry (official New IPS allow list entry): direction (0 both, 1 source, 2 destination), trafficType (0 IP, 1 LAN network, 2 subnet) and the matching ipAddress, network (network ID) or subnet.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createIpsAllowEntry' | 'getGridAllowList'>;

export function registerCreateIpsAllowEntryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createIpsAllowEntry',
        {
            description:
                'Exempt an IP address, LAN network or subnet from gateway IPS blocking. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createIpsAllowEntry',
            mutationSummary('create-ips-allow-entry', (args) => JSON.stringify(args.payload)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                checkAllowEntry(payload);
                return await runCreate({
                    spec: {
                        label: 'IPS allow list entry',
                        list: () => allPages((page, size) => client.getGridAllowList(page, size, undefined, siteId, customHeaders)),
                        nameKey: null,
                        normalize: allowEntryRequest,
                    },
                    payload,
                    dryRun,
                    write: () => client.createIpsAllowEntry(payload, siteId, customHeaders),
                    warnings: ['Traffic from or to the exempted target is no longer blocked by IPS.'],
                });
            }
        )
    );
}
