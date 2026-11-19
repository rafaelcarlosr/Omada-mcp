import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getAttackDefenseDefaults'>;

export function registerGetAttackDefenseDefaultsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAttackDefenseDefaults',
        {
            description: 'Get the default attack and defense (flood and scan protection) setting that resetAttackDefenseSetting restores.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getAttackDefenseDefaults', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getAttackDefenseDefaults(siteId, customHeaders))
        )
    );
}
