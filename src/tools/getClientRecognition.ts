import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'getClientRecognition'>;

export function registerGetClientRecognitionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientRecognition',
        {
            description: 'Show whether client recognition (device type and vendor detection) is on.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('getClientRecognition', async ({ customHeaders }) => toToolResult(await client.getClientRecognition(customHeaders)))
    );
}
