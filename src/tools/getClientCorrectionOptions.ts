import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = z.object({ customHeaders: customHeadersSchema });

type Client = Pick<OmadaClient, 'getClientCorrectionOptions'>;

export function registerGetClientCorrectionOptionsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientCorrectionOptions',
        {
            description: 'Get the controller-wide list of client device types a client can be corrected to.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientCorrectionOptions', async ({ customHeaders }) =>
            toToolResult(await client.getClientCorrectionOptions(customHeaders))
        )
    );
}
