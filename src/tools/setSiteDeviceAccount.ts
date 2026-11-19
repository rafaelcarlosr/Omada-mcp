import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceAccountSettingOpenApiVO02Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: deviceAccountSettingOpenApiVO02Schema.describe(
        'Device account (official DeviceAccountSettingOpenApiVO): username and a password of 10-64 characters mixing upper and lower case, digits and symbols, without repeated consecutive characters, different from the username.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteDeviceAccount' | 'setSiteDeviceAccount'>;

export function registerSetSiteDeviceAccountTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteDeviceAccount',
        {
            description:
                'Change the username and password used to log in to the devices of the site (web UI and SSH). Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteDeviceAccount',
            mutationSummary('set-site-device-account', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'device account',
                    read: () => client.getSiteDeviceAccount(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSiteDeviceAccount(payload, siteId, customHeaders),
                    warnings: ['Every adopted device in the site gets the new login; update any tool or password manager that uses the old one.'],
                })
        )
    );
}
