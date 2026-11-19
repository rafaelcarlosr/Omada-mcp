import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    deviceMac: deviceMacSchema.describe('MAC of the device or client the incident is about.'),
    anomalyCode: z.string().trim().min(1).describe('Anomaly event code of the incident.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listInfluencingDevices'>;

export function registerListInfluencingDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listInfluencingDevices',
        {
            description: 'List the devices affected by an incident on a device or client (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listInfluencingDevices', async ({ deviceMac, anomalyCode, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listInfluencingDevices(deviceMac, anomalyCode, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
