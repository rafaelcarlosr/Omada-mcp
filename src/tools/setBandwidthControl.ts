import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import * as schemas from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: schemas.bandwidthControlSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable, thresholdControlEnable, thresholdValue (1-100 %) and bandwidthPortSettings.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getBandwidthControl' | 'setBandwidthControl'>;

export function registerSetBandwidthControlTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setBandwidthControl',
        {
            description:
                'Change gateway bandwidth control: on or off, and the WAN usage threshold above which rules apply. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setBandwidthControl',
            mutationSummary('setBandwidthControl', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'bandwidth control',
                    schema: schemas.bandwidthControlSchema,
                    read: () => client.getBandwidthControl(siteId, customHeaders),
                    changes,
                    dryRun,
                    write: (payload) => client.setBandwidthControl(payload, siteId, customHeaders),
                })
        )
    );
}
