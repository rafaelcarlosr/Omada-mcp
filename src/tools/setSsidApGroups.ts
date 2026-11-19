import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ssidId: z.string().trim().min(1).describe('SSID ID from listAllSsids.'),
    apGroupIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(100)
        .describe('Complete list of AP group IDs (from listApGroups) the SSID is broadcast on.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listApGroups' | 'listSsidApGroups' | 'setSsidApGroups'>;

export function registerSetSsidApGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSsidApGroups',
        {
            description:
                'Set the AP groups an SSID is broadcast on; the list replaces the current one. APs outside these groups stop broadcasting it. Defaults to a preview of the current and requested groups; set dryRun:false to apply and verify.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSsidApGroups',
            mutationSummary('set-ssid-ap-groups', (args) => String(args.ssidId)),
            async ({ ssidId, apGroupIds, siteId, customHeaders, dryRun }) => {
                const ids = [...new Set(apGroupIds)].sort();
                const groups = toRecords(await client.listApGroups(siteId, customHeaders));
                const unknown = ids.filter((id) => !findRecord(groups, id));
                if (unknown.length) throw new Error(`No AP group with id ${unknown.join(', ')}. No request was sent.`);
                return await runSettings({
                    label: 'SSID AP groups',
                    read: async () => {
                        const bound = (await client.listSsidApGroups(ssidId, siteId, customHeaders)) as { apGroups?: unknown } | undefined;
                        return {
                            apGroupIds: toRecords(bound?.apGroups)
                                .map((group) => String(group.id))
                                .sort(),
                        };
                    },
                    payload: { apGroupIds: ids },
                    dryRun,
                    write: () => client.setSsidApGroups(ssidId, ids, siteId, customHeaders),
                    warnings: ['APs outside the listed groups stop broadcasting this SSID and disconnect its clients.'],
                });
            }
        )
    );
}
