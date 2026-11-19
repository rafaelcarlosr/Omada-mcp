import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ipsSignatureConfigSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    signId: z.string().trim().min(1).describe('Signature ID from getGridSignature.'),
    payload: ipsSignatureConfigSchema.describe(
        'Signature suppression (official IpsSignatureConfig): type (0 all traffic, 1 packet tracking), and for packet tracking direction, trafficType (0 IP, 1 subnet) with ip or subnet.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridSignature' | 'updateIpsSignature'>;

export function registerUpdateIpsSignatureTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateIpsSignature',
        {
            description:
                'Change how an IPS signature is suppressed: for all traffic, or only for tracked IPs or subnets. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateIpsSignature',
            mutationSummary('update-ips-signature', (args) => String(args.signId)),
            async ({ signId, payload, siteId, customHeaders, dryRun }) => {
                if (payload.type === 1 && (payload.trafficType === 0 ? !payload.ip : payload.trafficType === 1 ? !payload.subnet : true)) {
                    throw new Error('Packet tracking (type 1) needs trafficType with ip (0) or subnet (1). No request was sent.');
                }
                return await runUpdate({
                    spec: {
                        label: 'IPS signature',
                        list: () => allPages((page, size) => client.getGridSignature(page, size, siteId, customHeaders)),
                        idKeys: ['id', 'signId'],
                        nameKey: null,
                    },
                    id: signId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateIpsSignature(signId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
