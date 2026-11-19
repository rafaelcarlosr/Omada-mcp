import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnRadiusProfiles'>;

export function registerListSslVpnRadiusProfilesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnRadiusProfiles',
        {
            description: 'List the RADIUS profiles the SSL VPN server can authenticate against.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnRadiusProfiles', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnRadiusProfiles(siteId, customHeaders))
        )
    );
}
