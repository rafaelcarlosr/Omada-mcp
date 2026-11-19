import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteRememberDeviceSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: siteRememberDeviceSettingSchema.describe('Remember device setting (official SiteRememberDeviceSetting): remember.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteRememberSetting' | 'setSiteRememberSetting'>;

export function registerSetSiteRememberSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteRememberSetting',
        {
            description:
                'Turn on or off "remember devices" for the site, which keeps disconnected devices listed. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteRememberSetting',
            mutationSummary('set-site-remember-setting', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'remember device',
                    read: () => client.getSiteRememberSetting(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSiteRememberSetting(payload, siteId, customHeaders),
                })
        )
    );
}
