import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteLedSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: siteLedSettingSchema.describe('Site LED setting (official SiteLedSetting): enable.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getLedSetting' | 'setSiteLed'>;

export function registerSetSiteLedTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteLed',
        {
            description:
                'Turn the LEDs of every device in the site on or off. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteLed',
            mutationSummary('set-site-led', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'site LED',
                    read: () => client.getLedSetting(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSiteLed(payload, siteId, customHeaders),
                })
        )
    );
}
