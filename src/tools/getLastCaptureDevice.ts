import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getLastCaptureDevice'>;

export function registerGetLastCaptureDeviceTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getLastCaptureDevice',
        {
            description: 'Get the device of the last packet capture of the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getLastCaptureDevice', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getLastCaptureDevice(siteId, customHeaders))
        )
    );
}
