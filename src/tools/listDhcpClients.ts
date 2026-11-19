import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    searchKey: z.string().trim().min(1).optional().describe('Optional case-insensitive filter on MAC, IP or host name.'),
});

type Client = Pick<OmadaClient, 'listDhcpClients'>;

export function registerListDhcpClientsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDhcpClients',
        {
            description: 'List the DHCP leases of every DHCP server of a site (gateways and switches).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listDhcpClients', async ({ searchKey, siteId, customHeaders }) => {
            const leases = await client.listDhcpClients(siteId, customHeaders);
            if (!searchKey) return toToolResult(leases);
            const needle = searchKey.toLowerCase();
            return toToolResult(leases.filter((lease) => JSON.stringify(lease).toLowerCase().includes(needle)));
        })
    );
}
