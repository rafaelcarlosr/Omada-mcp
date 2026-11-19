import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { portalLogoutConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: portalLogoutConfigOpenApiVOSchema.describe('Portal logout setting (official PortalLogoutConfigOpenApiVO): domain.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getPortalLogoutSetting' | 'setPortalLogoutSetting'>;

export function registerSetPortalLogoutSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setPortalLogoutSetting',
        {
            description:
                'Change the domain of the captive portal logout URL. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setPortalLogoutSetting',
            mutationSummary('set-portal-logout-setting', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'portal logout domain',
                    read: () => client.getPortalLogoutSetting(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setPortalLogoutSetting(payload, siteId, customHeaders),
                })
        )
    );
}
