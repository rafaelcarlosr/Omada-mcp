import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    signId: z.string().trim().min(1).describe('Signature ID from getGridSignature.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIpsSignature' | 'getGridSignature'>;

export function registerDeleteIpsSignatureTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIpsSignature',
        {
            description:
                'Delete an IPS signature suppression, so the signature blocks matching traffic again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIpsSignature',
            mutationSummary('delete-ips-signature', (args) => String(args.signId)),
            async ({ signId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'IPS signature',
                        list: () => allPages((page, size) => client.getGridSignature(page, size, siteId, customHeaders)),
                        idKeys: ['id', 'signId'],
                        nameKey: null,
                    },
                    id: signId,
                    dryRun,
                    write: () => client.deleteIpsSignature(signId, siteId, customHeaders),
                    warnings: ['The signature blocks matching traffic again.'],
                })
        )
    );
}
