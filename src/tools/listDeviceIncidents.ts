import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    deviceMac: deviceMacSchema.describe('MAC of the device.'),
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listDeviceIncidents'>;

export function registerListDeviceIncidentsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDeviceIncidents',
        {
            description: 'List the incidents of one device over a period (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listDeviceIncidents', async ({ deviceMac, startTime, endTime, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listDeviceIncidents(deviceMac, { startTime, endTime }, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
