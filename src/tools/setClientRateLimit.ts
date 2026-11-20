import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { requireClientDetail, runSettings } from './resourceMutationShared.js';

const limitSchema = z.number().int().min(1).max(1024);

export function registerSetClientRateLimitTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = siteInputSchema.extend({
        clientMac: deviceMacSchema,
        downLimit: limitSchema.describe('Download limit, 1-1024 in the chosen unit.'),
        upLimit: limitSchema.describe('Upload limit, 1-1024 in the chosen unit.'),
        unit: z.enum(['kbps', 'mbps']).optional().default('kbps').describe('Unit for both limits: kbps (default) or mbps.'),
        dryRun: z.boolean().optional().default(true).describe('Preview without changing the controller. Set false explicitly to apply.'),
    });
    server.registerTool(
        'setClientRateLimit',
        {
            description:
                'Set custom client rate limits. The controller takes 1-1024 per direction in Kbps or Mbps (unit). Preview is the default and shows the current limits; set dryRun:false to apply once and verify by reading the client back.',
            inputSchema: inputSchema.shape,
            annotations: { readOnlyHint: false, destructiveHint: true },
        },
        wrapMutationToolHandler(
            'setClientRateLimit',
            ({ clientMac, siteId }, result, mode) => ({
                action: 'setClientRateLimit',
                target: clientMac,
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'submitted',
                summary: mode === 'dry-run' ? 'Client rate-limit change planned.' : 'Client rate-limit change submitted.',
                result,
            }),
            async ({ clientMac, downLimit, upLimit, unit, siteId, customHeaders, dryRun }) => {
                const unitCode = unit === 'mbps' ? 2 : 1;
                return await runSettings({
                    label: 'client rate limit',
                    read: async () =>
                        (await requireClientDetail(() => client.getClientDetail(clientMac, siteId, customHeaders), clientMac)).rateLimit,
                    payload: { upEnable: true, upUnit: unitCode, upLimit, downEnable: true, downUnit: unitCode, downLimit },
                    dryRun,
                    write: () => client.setClientRateLimit(clientMac, downLimit, upLimit, siteId, customHeaders, unitCode),
                });
            }
        )
    );
}
