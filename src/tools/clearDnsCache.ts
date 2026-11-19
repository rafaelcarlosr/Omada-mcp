import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'clearDnsCache'>;

export function registerClearDnsCacheTool(server: McpServer, client: Client): void {
    server.registerTool(
        'clearDnsCache',
        {
            description:
                'Clear the cached DNS records of the site gateway; later lookups go to the upstream servers again. Defaults to a preview; set dryRun:false to clear.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'clearDnsCache',
            mutationSummary('clear-dns-cache', () => 'site'),
            async ({ siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'DNS cache clear',
                    dryRun,
                    preflight: async () => ({ siteId: siteId ?? 'default site' }),
                    write: () => client.clearDnsCache(siteId, customHeaders),
                })
        )
    );
}
