import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import * as schemas from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: schemas.updateMacAuthOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields to change: enable, ssids (SSID IDs), radiusProfileId, mabEnable, macFormat, emptyPwdEnable and nasId. mabEnable and emptyPwdEnable default to false when enabling.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getMacAuthSetting' | 'setMacAuthSetting'>;

/** The read lists SSIDs as { id, ssidId, ssidName }; the write takes their IDs. */
function asRequest(value: unknown): RecordLike {
    if (typeof value !== 'object' || value === null) return {};
    const record = value as RecordLike;
    const ssids = Array.isArray(record.ssids) ? record.ssids : [];
    return {
        ...record,
        ssids: ssids.map((ssid) =>
            typeof ssid === 'object' && ssid !== null ? String((ssid as RecordLike).ssidId ?? (ssid as RecordLike).id) : ssid
        ),
    };
}

export function registerSetMacAuthSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setMacAuthSetting',
        {
            description:
                'Change MAC-based authentication: clients on the listed SSIDs are authorized by their MAC against a RADIUS profile. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setMacAuthSetting',
            mutationSummary('setMacAuthSetting', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => asRequest(await client.getMacAuthSetting(siteId, customHeaders));
                const current = await read();
                // Controller 6.3 rejects enabling without these flags (-1001); they default to off when never set.
                const defaults = changes.enable
                    ? {
                          ...(current.mabEnable === undefined ? { mabEnable: false } : {}),
                          ...(current.emptyPwdEnable === undefined ? { emptyPwdEnable: false } : {}),
                      }
                    : {};
                return await runMergedSettings({
                    label: 'MAC authentication',
                    schema: schemas.updateMacAuthOpenApiVOSchema,
                    read,
                    changes: { ...defaults, ...changes },
                    dryRun,
                    write: (payload) => client.setMacAuthSetting(payload, siteId, customHeaders),
                    // While off, the controller keeps its stored SSID list and other fields, so only the switch is verified.
                    verifyView: (payload) => (payload.enable ? payload : { enable: false }),
                    check: (payload) => {
                        if (payload.enable && (!payload.radiusProfileId || payload.ssids.length === 0)) {
                            throw new Error('Enabling MAC authentication needs radiusProfileId and at least one SSID. No request was sent.');
                        }
                    },
                });
            }
        )
    );
}
