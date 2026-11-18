import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'getSwitchDdmInfo'>;

export function registerGetSwitchDdmInfoTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchDdmInfo',
        {
            description:
                'Get SFP digital diagnostics (DDM): temperature, voltage and optical power for each SFP module; empty when the switch has none.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSwitchDdmInfo', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.getSwitchDdmInfo(switchMac, siteId, customHeaders))
        )
    );
}
