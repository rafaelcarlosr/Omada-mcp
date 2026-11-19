import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { clientTrafficOpenApiQueryDataVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    query: clientTrafficOpenApiQueryDataVOSchema.describe(
        'Query (official ClientTrafficOpenApiQueryDataVO): page, pageSize 1-100, start and end in epoch seconds, optional searchKey and clientTrafficFilters of { network, vlanId }.'
    ),
});

type Client = Pick<OmadaClient, 'searchClientTraffic'>;

export function registerSearchClientTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'searchClientTraffic',
        {
            description:
                'Search client traffic over a period, filtered by name, network or VLAN (v2 query). Read-only, although the route is a POST.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('searchClientTraffic', async ({ query, siteId, customHeaders }) =>
            toToolResult(await client.searchClientTraffic(query, siteId, customHeaders))
        )
    );
}
