import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createSiteEntity02Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: createSiteEntity02Schema.describe(
        'New site (official CreateSiteEntity): name, region (country name such as "Brazil"), timeZone (such as "America/Sao_Paulo"), scenario from listScenarios, deviceAccountSetting { username, password of 10-64 characters mixing upper, lower, digits and symbols without repeated consecutive characters }, optional type (0 basic, 1 pro), tagIds, address, longitude/latitude, supportES and supportL2.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSite' | 'getSiteDetail' | 'listSites'>;

export function registerCreateSiteTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSite',
        {
            description:
                'Create a new site on the controller. The device account password is write-only and not verified by readback. Defaults to a preview; set dryRun:false to create once and verify the site by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSite',
            mutationSummary('create-site', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'site',
                        list: () => client.listSites(customHeaders),
                        idKeys: ['siteId'],
                        detail: (id) => client.getSiteDetail(id, customHeaders),
                        writeOnly: ['deviceAccountSetting'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createSite(payload, customHeaders),
                })
        )
    );
}
