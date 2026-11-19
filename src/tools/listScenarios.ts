import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'listScenarios'>;

export function registerListScenariosTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listScenarios',
        {
            description: 'List the site scenarios (built-in and custom) with whether each is built in.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('listScenarios', async ({ customHeaders }) => toToolResult(await client.listScenarios(customHeaders)))
    );
}
