import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listApSsidOverrideAuditLogs'>;

export function registerListApSsidOverrideAuditLogsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApSsidOverrideAuditLogs',
        {
            description: 'List the audit log of SSID override changes on one access point (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listApSsidOverrideAuditLogs', async ({ apMac, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listApSsidOverrideAuditLogs(apMac, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
