import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ouiId: z.string().trim().min(1).describe('OUI profile ID from getOuiProfileList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteOuiProfile' | 'getOuiProfileList'>;

export function registerDeleteOuiProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteOuiProfile',
        {
            description: 'Delete an OUI profile. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteOuiProfile',
            mutationSummary('delete-oui-profile', (args) => String(args.ouiId)),
            async ({ ouiId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'OUI profile',
                        list: () => client.getOuiProfileList(1, 1000, siteId, customHeaders),
                    },
                    id: ouiId,
                    dryRun,
                    write: () => client.deleteOuiProfile(ouiId, siteId, customHeaders),
                    warnings: ['OUI-based VLAN rules that use this profile stop matching these devices; check listSwitchOuiRules first.'],
                })
        )
    );
}
