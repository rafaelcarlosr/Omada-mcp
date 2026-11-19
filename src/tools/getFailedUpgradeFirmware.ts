import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.pick({ customHeaders: true }).extend({
    upgradeLogId: z.string().trim().min(1).describe('Upgrade log ID from the firmware upgrade logs.'),
});

type Client = Pick<OmadaClient, 'getFailedUpgradeFirmware'>;

export function registerGetFailedUpgradeFirmwareTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getFailedUpgradeFirmware',
        {
            description: 'Get the firmware available for the devices whose upgrade failed in an upgrade run.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getFailedUpgradeFirmware', async ({ upgradeLogId, customHeaders }) =>
            toToolResult(await client.getFailedUpgradeFirmware(upgradeLogId, customHeaders))
        )
    );
}
