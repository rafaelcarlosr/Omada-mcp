import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listLockToApAps'>;

export function registerListLockToApApsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listLockToApAps',
        {
            description: 'List the access points that clients can be locked to (lock-to-AP candidates).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listLockToApAps', async ({ siteId, customHeaders }) => toToolResult(await client.listLockToApAps(siteId, customHeaders)))
    );
}
