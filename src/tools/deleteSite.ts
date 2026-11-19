import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { targetSiteSchema } from './siteAdminShared.js';

const inputSchema = targetSiteSchema.extend({ dryRun: dryRunSchema });

type Client = Pick<OmadaClient, 'configuredSiteId' | 'deleteSite' | 'listDevices' | 'listSites'>;

export function registerDeleteSiteTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSite',
        {
            description:
                'Delete a site and everything configured in it (networks, SSIDs, profiles, schedules, logs). Refused while the site still has devices (forget them first) and for the site configured as OMADA_SITE_ID. Defaults to a preview of the site; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSite',
            mutationSummary('delete-site', (args) => String(args.siteId)),
            async ({ siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'site', list: () => client.listSites(customHeaders), idKeys: ['siteId'] },
                    id: siteId,
                    dryRun,
                    guard: async (site) => {
                        if (siteId === client.configuredSiteId()) {
                            throw new Error(
                                `"${String(site.name)}" is the site configured as OMADA_SITE_ID and is not deleted. No request was sent.`
                            );
                        }
                        const devices = await client.listDevices(siteId, customHeaders);
                        if (devices.length > 0) {
                            throw new Error(
                                `"${String(site.name)}" still has ${devices.length} device(s); forget them first so they are not left managed by a deleted site. No request was sent.`
                            );
                        }
                    },
                    write: () => client.deleteSite(siteId, customHeaders),
                    warnings: [
                        'Everything configured in the site (networks, SSIDs, profiles, schedules, logs) is deleted and cannot be restored without a backup.',
                    ],
                })
        )
    );
}
