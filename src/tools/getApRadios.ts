import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema
    .extend({
        apMac: deviceMacSchema.describe('MAC address of the access point (e.g. "AA-BB-CC-DD-EE-FF"). Use listDevices to find AP MACs.'),
    })
    .required({ apMac: true });

export function registerGetApRadiosTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getApRadios',
        {
            description:
                'Get the radio traffic counters of one access point, per band (radioTraffic2g, radioTraffic5g and others the AP has): packets, bytes, drops, errors and retries. Use getRadiosConfig for channel and power. Use listDevices to get the apMac.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApRadios', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApRadios(apMac, siteId, customHeaders))
        )
    );
}
