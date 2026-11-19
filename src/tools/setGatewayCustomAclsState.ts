import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, findRecord, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    aclIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Custom ACL IDs from getOsgCustomAclList; only these change.'),
    enabled: z.boolean().optional().describe('Turn the ACLs on or off; unchanged when omitted.'),
    logEnabled: z.boolean().optional().describe('Turn ACL logging on or off; needs remote logging enabled on the site. Unchanged when omitted.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOsgCustomAclList' | 'setGatewayCustomAclsState'>;

export function registerSetGatewayCustomAclsStateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setGatewayCustomAclsState',
        {
            description:
                'Turn several gateway custom ACLs, or their logging, on or off at once. Only the listed IDs change. Defaults to a preview of each ACL; set dryRun:false to apply and verify per ACL.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setGatewayCustomAclsState',
            mutationSummary('set-gateway-custom-acls-state', (args) => `${(args.aclIds as string[]).length} ACL(s)`),
            async ({ aclIds, enabled, logEnabled, siteId, customHeaders, dryRun }) => {
                if (enabled === undefined && logEnabled === undefined) throw new Error('Set enabled, logEnabled or both. No request was sent.');
                const ids = [...new Set(aclIds)];
                const list = () => allPages((page, size) => client.getOsgCustomAclList(page, size, siteId, customHeaders));
                const rows = await list();
                const missing = ids.filter((id) => !findRecord(rows, id));
                if (missing.length) throw new Error(`No gateway custom ACL with id ${missing.join(', ')}. No request was sent.`);
                const wanted = {
                    ...(enabled === undefined ? {} : { status: enabled }),
                    ...(logEnabled === undefined ? {} : { logStatus: logEnabled }),
                };
                const code = (value: boolean | undefined): 0 | 1 | 2 => (value === undefined ? 2 : value ? 0 : 1);
                return await runSettings({
                    label: 'gateway custom ACL state',
                    read: async () => {
                        const current = await list();
                        return Object.fromEntries(
                            ids.map((id) => {
                                const row = findRecord(current, id);
                                return [id, { status: row?.status, logStatus: row?.logStatus }];
                            })
                        );
                    },
                    payload: Object.fromEntries(ids.map((id) => [id, wanted])),
                    dryRun,
                    write: () => client.setGatewayCustomAclsState(ids, code(enabled), code(logEnabled), siteId, customHeaders),
                });
            }
        )
    );
}
