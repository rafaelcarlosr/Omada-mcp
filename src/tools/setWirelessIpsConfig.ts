import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateWipsConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: updateWipsConfigOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: status, deauthEn, dynamicEn and lockTime (300-36000 seconds, needed with dynamicEn).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getWirelessIpsConfig' | 'setWirelessIpsConfig'>;

export function registerSetWirelessIpsConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setWirelessIpsConfig',
        {
            description:
                'Change the wireless IPS setting of a site. When enabled, APs deauthenticate attackers and/or block them dynamically, which can disconnect misidentified clients. Unlisted fields keep their current values; disabling it also turns off deauthentication and dynamic blocking. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setWirelessIpsConfig',
            mutationSummary('set-wireless-ips', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getWirelessIpsConfig(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged = { deauthEn: false, dynamicEn: false, ...(await read()), ...changes };
                if (merged.status === true && merged.deauthEn !== true && merged.dynamicEn !== true) {
                    throw new Error('Enabling wireless IPS needs deauthEn or dynamicEn. No request was sent.');
                }
                if (merged.dynamicEn === true && merged.lockTime === undefined) throw new Error('dynamicEn needs lockTime. No request was sent.');
                // The controller rejects a disabled IPS with deauthentication or dynamic blocking still on (-1001).
                const payload = updateWipsConfigOpenApiVOSchema.parse(
                    merged.status === true
                        ? {
                              status: true,
                              deauthEn: merged.deauthEn,
                              dynamicEn: merged.dynamicEn,
                              ...(merged.dynamicEn === true ? { lockTime: merged.lockTime } : {}),
                          }
                        : { status: false, deauthEn: false, dynamicEn: false }
                );
                return await runSettings({
                    label: 'wireless IPS',
                    read,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.setWirelessIpsConfig(payload, siteId, customHeaders),
                    warnings: [
                        payload.status
                            ? 'APs act against detected attackers, which can disconnect misidentified clients.'
                            : 'Disabling wireless IPS also turns off deauthentication and dynamic blocking.',
                    ],
                });
            }
        )
    );
}
