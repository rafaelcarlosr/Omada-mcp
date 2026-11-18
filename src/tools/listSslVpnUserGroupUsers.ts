import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { redactPasswords } from './hotspotAccountShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('SSL VPN user group ID from listSslVpnUserGroups.'),
});

type Client = Pick<OmadaClient, 'listSslVpnUserGroupUsers'>;

export function registerListSslVpnUserGroupUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnUserGroupUsers',
        {
            description: 'List the SSL VPN users that belong to one SSL VPN user group. Passwords are redacted. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSslVpnUserGroupUsers', async ({ groupId, siteId, customHeaders }) =>
            toToolResult(redactPasswords(await client.listSslVpnUserGroupUsers(groupId, siteId, customHeaders)))
        )
    );
}
