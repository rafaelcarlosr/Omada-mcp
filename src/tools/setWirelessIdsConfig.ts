import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateWidsConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: updateWidsConfigOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: status, level (0 high, 1 low, 2 custom) and detection (detection types, only with level 2).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getWirelessIdsConfig' | 'setWirelessIdsConfig'>;

export function registerSetWirelessIdsConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setWirelessIdsConfig',
        {
            description:
                'Change the wireless IDS setting of a site. APs then report rogue and spoofing activity. Unlisted fields keep their current values; level and detection only change while it is enabled. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setWirelessIdsConfig',
            mutationSummary('set-wireless-ids', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getWirelessIdsConfig(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged = { ...(await read()), ...changes };
                if (merged.status !== true && (changes.level !== undefined || changes.detection !== undefined)) {
                    throw new Error(
                        'The controller does not keep level or detection while wireless IDS is disabled; set status:true in the same change. No request was sent.'
                    );
                }
                if (merged.level === 2 && !(Array.isArray(merged.detection) && merged.detection.length)) {
                    throw new Error('level 2 (custom) needs detection. No request was sent.');
                }
                const payload = updateWidsConfigOpenApiVOSchema.parse({
                    status: merged.status,
                    level: merged.level ?? 0,
                    ...(merged.level === 2 ? { detection: merged.detection } : {}),
                });
                return await runSettings({
                    label: 'wireless IDS',
                    read,
                    // A disabled IDS reports its stored level, so only the status is verified.
                    payload: (payload.status ? payload : { status: false }) as RecordLike,
                    dryRun,
                    write: () => client.setWirelessIdsConfig(payload, siteId, customHeaders),
                });
            }
        )
    );
}
