import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const flags = z.record(z.string(), z.boolean());

const inputSchema = siteInputSchema.extend({
    delayEnable: z.boolean().optional().describe('Group similar alerts into one email.'),
    delay: z.number().int().min(1).optional().describe('Seconds to group similar alerts in one email.'),
    eventLevel: flags.optional().describe('Levels to email, e.g. { info: true } (critical, error, warning, info).'),
    eventObjectType: flags
        .optional()
        .describe('Objects to email about, e.g. { wiredClient: false } (gateway, switch, ap, wiredClient, wirelessClient).'),
    eventCategory: flags
        .optional()
        .describe(
            'Categories to email, e.g. { roaming: false } (access, authentication, roaming, wirelessNetwork, wiredNetwork, link, wanAndServices, deviceStatus, security).'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getAnomalyNotificationSetting' | 'setAnomalyNotification'>;

export function registerSetAnomalyNotificationTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setAnomalyNotification',
        {
            description:
                'Change which incidents are emailed (levels, object types, categories) and how alerts are grouped. Only the fields sent change; the controller needs the complete setting, so the change is merged over the current one. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setAnomalyNotification',
            mutationSummary('set-anomaly-notification', (args) => args.siteId ?? 'default-site'),
            async ({ delayEnable, delay, eventLevel, eventObjectType, eventCategory, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> =>
                    ((await client.getAnomalyNotificationSetting(siteId, customHeaders)) ?? {}) as RecordLike;
                const alertChange = { ...(delayEnable === undefined ? {} : { delayEnable }), ...(delay === undefined ? {} : { delay }) };
                const emailChange = {
                    ...(eventLevel ? { eventLevel } : {}),
                    ...(eventObjectType ? { eventObjectType } : {}),
                    ...(eventCategory ? { eventCategory } : {}),
                };
                if (Object.keys(alertChange).length === 0 && Object.keys(emailChange).length === 0) throw new Error('Send at least one change.');
                return await runSettings({
                    label: 'incident notification',
                    read,
                    payload: {
                        ...(Object.keys(alertChange).length ? { alertEmailSetting: alertChange } : {}),
                        ...(Object.keys(emailChange).length ? { email: emailChange } : {}),
                    },
                    dryRun,
                    write: async () => {
                        const current = await read();
                        const alert = (current.alertEmailSetting ?? {}) as RecordLike;
                        const email = (current.email ?? {}) as Record<string, Record<string, boolean> | undefined>;
                        return await client.setAnomalyNotification(
                            {
                                alertEmailSetting: {
                                    delayEnable: (delayEnable ?? alert.delayEnable) === true,
                                    ...((delay ?? alert.delay) !== undefined ? { delay: (delay ?? alert.delay) as number } : {}),
                                },
                                email: {
                                    eventLevel: { ...email.eventLevel, ...eventLevel },
                                    eventObjectType: { ...email.eventObjectType, ...eventObjectType },
                                    eventCategory: { ...email.eventCategory, ...eventCategory },
                                },
                            },
                            siteId,
                            customHeaders
                        );
                    },
                });
            }
        )
    );
}
