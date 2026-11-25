import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
    radioIds: z
        .array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
        .min(1)
        .max(4)
        .refine((ids) => new Set(ids).size === ids.length, 'Bands must be unique.')
        .describe('Bands to scan: 0 2.4GHz, 1 5GHz, 2 5GHz-2, 3 6GHz. Each band needs at least one SSID.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getApRfScanResult' | 'startApRfScan'>;

export function registerStartApRfScanTool(server: McpServer, client: Client): void {
    server.registerTool(
        'startApRfScan',
        {
            description:
                'Start an RF scan on an access point; read the outcome with getApRfScanResult. Wireless clients on the scanned bands lose service while the scan runs. The controller rejects bands without an SSID (-34800) and APs that cannot scan (-34809; seen on an EAP610 v3). Defaults to a preview of the last result; set dryRun:false to send.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'startApRfScan',
            mutationSummary('start-ap-rf-scan', (args) => String(args.apMac)),
            async ({ apMac, radioIds, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'RF scan',
                    dryRun,
                    preflight: async () => ({ apMac, radioIds, lastResult: await client.getApRfScanResult(apMac, siteId, customHeaders) }),
                    write: () => client.startApRfScan(apMac, { radioIdList: radioIds }, siteId, customHeaders),
                    warnings: ['Wireless clients on the scanned bands lose service while the scan runs.'],
                })
        )
    );
}
