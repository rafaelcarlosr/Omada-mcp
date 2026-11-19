import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateSiteEntity02Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { targetSiteSchema } from './siteAdminShared.js';

const inputSchema = targetSiteSchema.extend({
    payload: updateSiteEntity02Schema.describe(
        'Complete site settings (official UpdateSiteEntity): region, timeZone and scenario are required; name, tagIds (from listSiteTags), ntpEnable with ntpServers, dst, address, longitude/latitude, supportES and supportL2 are optional.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteDetail' | 'listSites' | 'updateSite'>;

export function registerUpdateSiteTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSite',
        {
            description:
                'Change a site name, region, time zone, scenario, tags, NTP, daylight saving, address or map position. Defaults to a preview of the current site and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSite',
            mutationSummary('update-site', (args) => String(args.siteId)),
            async ({ siteId, payload, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'site',
                        list: () => client.listSites(customHeaders),
                        idKeys: ['siteId'],
                        detail: (id) => client.getSiteDetail(id, customHeaders),
                    },
                    id: siteId,
                    payload,
                    dryRun,
                    write: () => client.updateSite(siteId, payload, customHeaders),
                    warnings: ['Changing the time zone or NTP setting changes the clock of every device in the site.'],
                })
        )
    );
}
