import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { remoteLogSettingVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: remoteLogSettingVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable, host (syslog server IP or domain), port and moreClientLog.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRemoteLoggingSetting' | 'setSiteRemoteLogging'>;

export function registerSetSiteRemoteLoggingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteRemoteLogging',
        {
            description:
                'Change where the site devices send syslog: on or off, server host and port, and extra client logs. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteRemoteLogging',
            mutationSummary('setSiteRemoteLogging', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'site remote logging',
                    schema: remoteLogSettingVOSchema,
                    read: async () =>
                        ((await client.getRemoteLoggingSetting(siteId, customHeaders)) as { remoteLog?: unknown } | undefined)?.remoteLog,
                    changes,
                    dryRun,
                    write: (remoteLog) => client.setSiteRemoteLogging({ remoteLog }, siteId, customHeaders),
                    check: (remoteLog) => {
                        if (remoteLog.enable && !remoteLog.host) throw new Error('Enabling remote logging needs host. No request was sent.');
                    },
                })
        )
    );
}
