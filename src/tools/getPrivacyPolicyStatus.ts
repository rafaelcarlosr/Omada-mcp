import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'getPrivacyPolicyStatus'>;

export function registerGetPrivacyPolicyStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPrivacyPolicyStatus',
        {
            description: 'Show whether the controller privacy policy has been accepted.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('getPrivacyPolicyStatus', async ({ customHeaders }) => toToolResult(await client.getPrivacyPolicyStatus(customHeaders)))
    );
}
