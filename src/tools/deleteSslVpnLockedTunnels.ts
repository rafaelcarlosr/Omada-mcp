import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    lockTunnelIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Lock IDs from listSslVpnLockedTunnels; only these are deleted.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSslVpnLockedTunnel' | 'deleteSslVpnLockedTunnels' | 'listSslVpnLockedTunnels'>;

export function registerDeleteSslVpnLockedTunnelsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSslVpnLockedTunnels',
        {
            description:
                'Unlock SSL VPN tunnels by deleting their locks. Only the listed IDs are deleted, never all. Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSslVpnLockedTunnels',
            mutationSummary('delete-ssl-vpn-locked-tunnels', (args) => `${(args.lockTunnelIds as string[]).length} lock(s)`),
            async ({ lockTunnelIds, siteId, customHeaders, dryRun }) => {
                const ids = [...new Set(lockTunnelIds)];
                return await runBatchDelete({
                    spec: { label: 'locked SSL VPN tunnel', list: () => client.listSslVpnLockedTunnels(siteId, customHeaders), nameKey: null },
                    ids,
                    dryRun,
                    write: () =>
                        ids.length === 1
                            ? client.deleteSslVpnLockedTunnel(ids[0], siteId, customHeaders)
                            : client.deleteSslVpnLockedTunnels(ids, siteId, customHeaders),
                    warnings: ['The unlocked users or IPs can open SSL VPN tunnels again.'],
                });
            }
        )
    );
}
