import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnLockModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    lockId: z.string().trim().min(1).describe('SSL VPN lock ID from listSslVpnLocks.'),
    payload: sslVpnLockModifyOpenApiVOSchema.describe('SSL VPN lock (official SslVpnLockModifyOpenApiVO); type must stay the same.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSslVpnLocks' | 'updateSslVpnLock'>;

export function registerUpdateSslVpnLockTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSslVpnLock',
        {
            description:
                'Change the lock time or target of an SSL VPN lock. The type cannot be changed. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSslVpnLock',
            mutationSummary('update-ssl-vpn-lock', (args) => String(args.lockId)),
            async ({ lockId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'SSL VPN lock',
                        list: () => client.listSslVpnLocks(siteId, customHeaders),
                        nameKey: null,
                    },
                    id: lockId,
                    payload: payload,
                    dryRun,
                    write: () => client.updateSslVpnLock(lockId, payload, siteId, customHeaders),
                })
        )
    );
}
