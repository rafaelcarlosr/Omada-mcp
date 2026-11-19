import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    siteId: z
        .string()
        .trim()
        .min(1)
        .describe('ID of the site to bind, from listSitesAvailableForTemplate. Required; the default site is not assumed.'),
    switches: z
        .array(z.object({ mac: z.string().min(1), deviceTemplateId: z.string().min(1) }).strict())
        .optional()
        .describe('Optional switch-to-switch-template mapping as mac and deviceTemplateId pairs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'bindSiteToTemplate' | 'listDevices' | 'listSiteTemplateBoundSites' | 'listSites'>;

export function registerBindSiteToTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'bindSiteToTemplate',
        {
            description:
                'Bind a site to a site template. The template settings then replace the site settings and are pushed to its devices. Defaults to a preview with the site and its device count; set dryRun:false to bind and verify the site is listed as bound.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'bindSiteToTemplate',
            mutationSummary('bind-site-to-template', (args) => String(args.siteId)),
            async ({ siteTemplateId, siteId, switches, customHeaders, dryRun }) => {
                const site = findRecord(toRecords(await client.listSites(customHeaders)), siteId, ['siteId']);
                if (!site) throw new Error(`No site with id "${siteId}" exists. No request was sent.`);
                const devices = await client.listDevices(siteId, customHeaders);
                const bound = async () =>
                    ((await client.listSiteTemplateBoundSites(siteTemplateId, 1, 1000, customHeaders)) as { data?: unknown })?.data ?? [];
                return await runSettings({
                    label: 'template binding',
                    read: async () => ({ bound: Boolean(findRecord(toRecords(await bound()), siteId)) }),
                    payload: { bound: true },
                    dryRun,
                    write: () => client.bindSiteToTemplate(siteTemplateId, { siteId, ...(switches ? { switches } : {}) }, customHeaders),
                    verify: { attempts: 10, delayMs: 1500 },
                    warnings: [
                        `The template settings replace the settings of "${String(site.name)}" and are pushed to its ${devices.length} device(s).`,
                    ],
                });
            }
        )
    );
}
