import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Local user ID from listHotspotLocalUsers.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'clearLocalUserDynamicMac' | 'listHotspotLocalUsers'>;

export function registerClearLocalUserDynamicMacTool(server: McpServer, client: Client): void {
    server.registerTool(
        'clearLocalUserDynamicMac',
        {
            description:
                'Forget the devices a hotspot local user with dynamic MAC binding (bindingType 2) has used, so new devices can log in with it. Other binding types are refused. Defaults to a preview; set dryRun:false to apply.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'clearLocalUserDynamicMac',
            mutationSummary('clear-local-user-dynamic-mac', (args) => String(args.userId)),
            async ({ userId, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'dynamic MAC clear',
                    dryRun,
                    preflight: async () => {
                        const user = findRecord(toRecords(await client.listHotspotLocalUsers(siteId, customHeaders)), userId);
                        if (!user) throw new Error(`No hotspot local user with id "${userId}" exists. No request was sent.`);
                        if (user.bindingType !== 2) {
                            throw new Error(`"${String(user.userName)}" does not use dynamic MAC binding (bindingType 2). No request was sent.`);
                        }
                        return { userId, userName: user.userName, bindingType: user.bindingType };
                    },
                    write: () => client.clearLocalUserDynamicMac(userId, siteId, customHeaders),
                })
        )
    );
}
