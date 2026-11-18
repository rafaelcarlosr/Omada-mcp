import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { redactPasswords } from './hotspotAccountShared.js';

type Client = Pick<OmadaClient, 'listHotspotLocalUsers'>;

export function registerListHotspotLocalUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listHotspotLocalUsers',
        {
            description: 'List hotspot local users with their expiry, MAC binding and limits. Passwords are redacted. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listHotspotLocalUsers', async ({ siteId, customHeaders }) =>
            toToolResult(redactPasswords(await client.listHotspotLocalUsers(siteId, customHeaders)))
        )
    );
}
