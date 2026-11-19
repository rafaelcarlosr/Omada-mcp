import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteJumboOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: siteJumboOpenApiVOSchema.describe('Jumbo setting (official SiteJumboOpenApiVO): size in bytes, 1518-9216.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteJumbo' | 'setSiteJumbo'>;

export function registerSetSiteJumboTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteJumbo',
        {
            description:
                'Set the jumbo frame size (1518-9216 bytes) of the switches in the site. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteJumbo',
            mutationSummary('set-site-jumbo', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'jumbo frame',
                    read: () => client.getSiteJumbo(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSiteJumbo(payload, siteId, customHeaders),
                    warnings: ['Every switch in the site applies the new maximum frame size; devices on the path must accept the same size.'],
                })
        )
    );
}
