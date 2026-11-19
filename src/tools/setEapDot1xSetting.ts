import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import * as schemas from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: schemas.dot1xEapOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable, radiusProfileId and macFormat (both needed to enable), guestVlanSetting and eaps (AP MACs).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getEapDot1xSetting' | 'setEapDot1xSetting'>;

export function registerSetEapDot1xSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setEapDot1xSetting',
        {
            description:
                'Change EAP 802.1X: wired clients on the listed APs authenticate against a RADIUS profile. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setEapDot1xSetting',
            mutationSummary('setEapDot1xSetting', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'EAP 802.1X',
                    schema: schemas.dot1xEapOpenApiVOSchema,
                    read: () => client.getEapDot1xSetting(siteId, customHeaders),
                    changes,
                    dryRun,
                    write: (payload) => client.setEapDot1xSetting(payload, siteId, customHeaders),
                    check: (payload) => {
                        if (payload.enable && (!payload.radiusProfileId || payload.macFormat === undefined)) {
                            throw new Error('Enabling EAP 802.1X needs radiusProfileId and macFormat. No request was sent.');
                        }
                    },
                    // While off, the controller reads back only the switch.
                    verifyView: (payload) => (payload.enable ? payload : { enable: false }),
                })
        )
    );
}
