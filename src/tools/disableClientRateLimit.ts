import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { type RecordLike, requireClientDetail, runSettings } from './resourceMutationShared.js';

/** Limits are off when neither direction is enabled and no profile is applied. */
function limitState(rateLimit: unknown): RecordLike {
    const value = (typeof rateLimit === 'object' && rateLimit !== null ? rateLimit : {}) as RecordLike;
    return { upEnable: value.upEnable === true, downEnable: value.downEnable === true, profileApplied: value.rateLimitId !== undefined };
}

export function registerDisableClientRateLimitTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = siteInputSchema.extend({
        clientMac: deviceMacSchema,
        dryRun: z.boolean().optional().default(true).describe('Preview without changing the controller. Set false explicitly to apply.'),
    });
    server.registerTool(
        'disableClientRateLimit',
        {
            description:
                'Remove a client rate limit, whether custom limits or a rate limit profile. Preview is the default; set dryRun:false to apply once and verify by reading the client back.',
            inputSchema: inputSchema.shape,
            annotations: { readOnlyHint: false, destructiveHint: true },
        },
        wrapMutationToolHandler(
            'disableClientRateLimit',
            ({ clientMac, siteId }, result, mode) => ({
                action: 'disableClientRateLimit',
                target: clientMac,
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'submitted',
                summary: mode === 'dry-run' ? 'Client rate-limit change planned.' : 'Client rate-limit change submitted.',
                result,
            }),
            async ({ clientMac, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'client rate limit',
                    read: async () =>
                        limitState((await requireClientDetail(() => client.getClientDetail(clientMac, siteId, customHeaders), clientMac)).rateLimit),
                    payload: { upEnable: false, downEnable: false, profileApplied: false },
                    dryRun,
                    write: () => client.disableClientRateLimit(clientMac, siteId, customHeaders),
                })
        )
    );
}
