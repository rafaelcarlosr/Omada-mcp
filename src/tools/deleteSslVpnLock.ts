import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    lockId: z.string().trim().min(1).describe('SSL VPN lock ID from listSslVpnLocks.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSslVpnLock' | 'listSslVpnLocks'>;

export function registerDeleteSslVpnLockTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSslVpnLock',
        {
            description:
                'Remove an SSL VPN lock so the username or IP can connect again. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSslVpnLock',
            mutationSummary('delete-ssl-vpn-lock', (args) => String(args.lockId)),
            async ({ lockId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'SSL VPN lock',
                        list: () => client.listSslVpnLocks(siteId, customHeaders),
                        nameKey: null,
                    },
                    id: lockId,
                    dryRun,
                    write: () => client.deleteSslVpnLock(lockId, siteId, customHeaders),
                })
        )
    );
}
