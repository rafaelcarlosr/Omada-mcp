import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { redactPasswords } from './hotspotAccountShared.js';

const inputSchema = siteInputSchema.extend({
    operatorId: z.string().trim().min(1).describe('Operator ID from listHotspotOperators.'),
});

type Client = Pick<OmadaClient, 'getHotspotOperator'>;

export function registerGetHotspotOperatorTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getHotspotOperator',
        {
            description: 'Get one hotspot operator with its sites. The password is masked.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getHotspotOperator', async ({ operatorId, siteId, customHeaders }) =>
            toToolResult(redactPasswords([await client.getHotspotOperator(operatorId, siteId, customHeaders)])[0])
        )
    );
}
