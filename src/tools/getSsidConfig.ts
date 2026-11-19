import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    ssidId: z.string().trim().min(1).describe('SSID ID from listAllSsids.'),
});

type Client = Pick<OmadaClient, 'getSsidConfig'>;

export function registerGetSsidConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSsidConfig',
        {
            description:
                'Get the complete configuration of one SSID by ID (security, VLAN, rate limits, schedule, MAC filter, multicast, band steering, AP groups). Secrets are redacted.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSsidConfig', async ({ ssidId, siteId, customHeaders }) =>
            toToolResult(await client.getSsidConfig(ssidId, siteId, customHeaders))
        )
    );
}
