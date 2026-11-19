import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSiteLagHashAlgorithm'>;

export function registerGetSiteLagHashAlgorithmTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteLagHashAlgorithm',
        {
            description: 'Get the LAG hash algorithm of the switches in the site (0 source MAC to 5 source and destination IP).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteLagHashAlgorithm', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getSiteLagHashAlgorithm(siteId, customHeaders))
        )
    );
}
