import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runCreate, toRecords } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('ID of the site template to copy, from getSiteTemplateList.'),
    name: z.string().min(1).max(64).describe('Name of the copy.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'copySiteTemplate' | 'getSiteTemplateList'>;

export function registerCopySiteTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'copySiteTemplate',
        {
            description:
                'Copy a site template, settings included, under a new name. Defaults to a preview; set dryRun:false to copy once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'copySiteTemplate',
            mutationSummary('copy-site-template', (args) => String(args.siteTemplateId)),
            async ({ siteTemplateId, name, customHeaders, dryRun }) => {
                const list = async () => ((await client.getSiteTemplateList(1, 1000, customHeaders)) as { data?: unknown })?.data ?? [];
                if (!findRecord(toRecords(await list()), siteTemplateId)) {
                    throw new Error(`No site template with id "${siteTemplateId}" exists. List them again to get a current id.`);
                }
                return await runCreate({
                    spec: { label: 'site template', list },
                    payload: { name },
                    dryRun,
                    write: () => client.copySiteTemplate(siteTemplateId, name, customHeaders),
                });
            }
        )
    );
}
