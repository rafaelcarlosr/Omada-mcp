import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { redactPasswords } from './hotspotAccountShared.js';

type Client = Pick<OmadaClient, 'listHotspotOperators'>;

export function registerListHotspotOperatorsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listHotspotOperators',
        {
            description: 'List hotspot operator accounts with their role and sites. Passwords are redacted. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listHotspotOperators', async ({ siteId, customHeaders }) =>
            toToolResult(redactPasswords(await client.listHotspotOperators(siteId, customHeaders)))
        )
    );
}
