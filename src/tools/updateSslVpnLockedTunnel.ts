import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnLockCreateAndModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';
import { checkSslVpnLock } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    lockTunnelId: z.string().trim().min(1).describe('Lock ID from listSslVpnLockedTunnels.'),
    changes: sslVpnLockCreateAndModifyOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change, usually totalLockTime (minutes, 1-1080); the others keep their current values.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSslVpnLockedTunnels' | 'updateSslVpnLockedTunnel'>;

export function registerUpdateSslVpnLockedTunnelTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSslVpnLockedTunnel',
        {
            description:
                'Change a locked SSL VPN tunnel, usually its lock time. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSslVpnLockedTunnel',
            mutationSummary('update-ssl-vpn-locked-tunnel', (args) => String(args.lockTunnelId)),
            async ({ lockTunnelId, changes, siteId, customHeaders, dryRun }) => {
                const current = findRecord(toRecords(await client.listSslVpnLockedTunnels(siteId, customHeaders)), lockTunnelId);
                if (!current) throw new Error(`No locked SSL VPN tunnel with id "${lockTunnelId}" exists. List them again to get a current id.`);
                const payload = sslVpnLockCreateAndModifyOpenApiVOSchema.parse({
                    ...(pickBySchema(sslVpnLockCreateAndModifyOpenApiVOSchema, current) as RecordLike),
                    ...changes,
                });
                checkSslVpnLock(payload);
                return await runUpdate({
                    spec: { label: 'locked SSL VPN tunnel', list: () => client.listSslVpnLockedTunnels(siteId, customHeaders), nameKey: null },
                    id: lockTunnelId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateSslVpnLockedTunnel(lockTunnelId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
