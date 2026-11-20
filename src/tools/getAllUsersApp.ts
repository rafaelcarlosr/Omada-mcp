import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerGetAllUsersAppTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = z.object({ customHeaders: customHeadersSchema });
    server.registerTool(
        'getAllUsersApp',
        {
            description:
                'List every controller user, cloud and local, with role and email. Returns every page. The controller allows this only for apps in authorization-code mode; client-credentials apps get -44118.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAllUsersApp', async ({ customHeaders }) => toToolResult(await client.getAllUsersApp(customHeaders)))
    );
}
