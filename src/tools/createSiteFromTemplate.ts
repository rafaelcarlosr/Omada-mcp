import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createSiteByTemplate02Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: createSiteByTemplate02Schema.describe(
        'New site (official CreateSiteByTemplate): siteTemplateId, name, region, scenario, deviceAccountSetting { username, password }, optional tagIds, address, longitude/latitude, supportES and supportL2. Other settings come from the template.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSiteFromTemplate' | 'getSiteDetail' | 'listSites'>;

export function registerCreateSiteFromTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSiteFromTemplate',
        {
            description:
                'Create a site bound to a site template, so it starts with the template settings. The device account password is write-only. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSiteFromTemplate',
            mutationSummary('create-site-from-template', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'site',
                        list: () => client.listSites(customHeaders),
                        idKeys: ['siteId'],
                        detail: (id) => client.getSiteDetail(id, customHeaders),
                        writeOnly: ['deviceAccountSetting', 'siteTemplateId'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createSiteFromTemplate(payload, customHeaders),
                })
        )
    );
}
